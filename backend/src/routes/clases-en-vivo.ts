import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { tieneSuscripcionConClasesEnVivo } from "../lib/suscripciones";
import { log } from "../lib/logger";
import {
  obtenerAhoraGuatemala,
  obtenerClasesEnVivo,
  obtenerProximaClase,
  puedeEntrarAhora,
  GrupoConHorarios,
} from "../lib/horario-clases";
import { joinLimiter as rateLimitJoin } from "../middleware/rate-limit.middleware";

const router = Router();

// El link se muestra a los alumnos que entran a la clase: debe ser https y de zoom.us,
// nunca un dominio que solo contenga "zoom.us" en el path o la query (vuln_015).
export const urlZoomSchema = z
  .string()
  .url()
  .refine((url) => {
    try {
      const { protocol, hostname } = new URL(url);
      return protocol === "https:" && (hostname === "zoom.us" || hostname.endsWith(".zoom.us"));
    } catch {
      return false;
    }
  }, "urlZoom debe ser una URL https de zoom.us");

const grupoBaseSchema = z.object({
  nombre: z.string().min(1).optional(),
  audiencia: z.string().min(1).optional(),
  niveles: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  profesor: z.string().optional(),
  urlZoom: urlZoomSchema.optional(),
  duracionMinutos: z.number().int().positive().optional(),
});

const createGrupoSchema = grupoBaseSchema.extend({
  slug: z.string().min(1),
  nombre: z.string().min(1),
  audiencia: z.string().min(1),
  niveles: z.string().min(1),
  urlZoom: urlZoomSchema,
});

const updateGrupoSchema = grupoBaseSchema.extend({
  activo: z.boolean().optional(),
});

// GET /api/clases-en-vivo/horario — público. NUNCA incluye urlZoom.
router.get("/horario", async (_req: Request, res: Response) => {
  const grupos = await prisma.grupoClaseEnVivo.findMany({
    where: { activo: true },
    include: { horarios: { orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] } },
    orderBy: { id: "asc" },
  });

  // Serialización explícita: urlZoom queda afuera aunque el modelo lo tenga.
  const gruposPublicos = grupos.map((g) => ({
    id: g.id,
    slug: g.slug,
    nombre: g.nombre,
    audiencia: g.audiencia,
    niveles: g.niveles,
    descripcion: g.descripcion,
    profesor: g.profesor,
    duracionMinutos: g.duracionMinutos,
    horarios: g.horarios.map((h) => ({ diaSemana: h.diaSemana, horaInicio: h.horaInicio })),
  }));

  const gruposConHorarios: GrupoConHorarios[] = grupos.map((g) => ({
    id: g.id,
    duracionMinutos: g.duracionMinutos,
    horarios: g.horarios.map((h) => ({ diaSemana: h.diaSemana, horaInicio: h.horaInicio })),
  }));

  const ahora = obtenerAhoraGuatemala();
  const liveNow = obtenerClasesEnVivo(gruposConHorarios, ahora);
  const nextClass = obtenerProximaClase(gruposConHorarios, ahora);

  res.json({
    ahora,
    grupos: gruposPublicos,
    liveNow: liveNow.map((c) => ({
      grupoId: c.grupoId,
      horario: c.horario,
      minutosRestantes: c.minutosRestantes,
    })),
    nextClass: nextClass
      ? { grupoId: nextClass.grupoId, horario: nextClass.horario, minutosHasta: nextClass.minutosHasta }
      : null,
  });
});

// GET /api/clases-en-vivo/:grupoId/entrar — requiere alumno + plan con clases en vivo
router.get(
  "/:grupoId/entrar",
  verifyAlumnoJWT,
  rateLimitJoin,
  async (req: Request, res: Response) => {
    const grupoId = parseInt(req.params["grupoId"] as string);
    if (isNaN(grupoId)) {
      res.status(400).json({ error: "ID de grupo inválido" });
      return;
    }

    const tienePlan = await tieneSuscripcionConClasesEnVivo(req.alumno!.alumnoId);
    if (!tienePlan) {
      res.status(403).json({ reason: "plan_required", error: "Tu plan no incluye clases en vivo" });
      return;
    }

    const grupo = await prisma.grupoClaseEnVivo.findFirst({
      where: { id: grupoId, activo: true },
      include: { horarios: true },
    });
    if (!grupo) {
      res.status(404).json({ error: "Grupo no encontrado" });
      return;
    }

    const grupoConHorarios: GrupoConHorarios = {
      id: grupo.id,
      duracionMinutos: grupo.duracionMinutos,
      horarios: grupo.horarios.map((h) => ({ diaSemana: h.diaSemana, horaInicio: h.horaInicio })),
    };
    const ahora = obtenerAhoraGuatemala();
    const puedeEntrar = grupoConHorarios.horarios.some((h) =>
      puedeEntrarAhora(h, grupo.duracionMinutos, ahora)
    );

    if (!puedeEntrar) {
      const proxima = obtenerProximaClase([grupoConHorarios], ahora);
      res.status(409).json({
        reason: "not_live",
        error: "Esta clase no está en vivo en este momento",
        nextOccurrence: proxima ? { horario: proxima.horario, minutosHasta: proxima.minutosHasta } : null,
      });
      return;
    }

    log("info", `[ClasesEnVivo] Alumno ${req.alumno!.alumnoId} entró al grupo ${grupo.slug}`);
    res.json({ zoomUrl: grupo.urlZoom });
  }
);

// ─── Admin CRUD (mismo patrón que routes/cursos.ts: verifyJWT + auditLog) ───

router.post(
  "/",
  verifyJWT,
  auditLog("CREAR_GRUPO_CLASE_EN_VIVO", "clases-en-vivo"),
  async (req: Request, res: Response) => {
    const parsed = createGrupoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const grupo = await prisma.grupoClaseEnVivo.create({ data: parsed.data });
    res.status(201).json(grupo);
  }
);

router.patch(
  "/:id",
  verifyJWT,
  auditLog("ACTUALIZAR_GRUPO_CLASE_EN_VIVO", "clases-en-vivo"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const parsed = updateGrupoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const grupo = await prisma.grupoClaseEnVivo.update({
      where: { id },
      data: parsed.data,
    });
    res.json(grupo);
  }
);

router.post(
  "/:id/horarios",
  verifyJWT,
  auditLog("CREAR_HORARIO_CLASE", "clases-en-vivo"),
  async (req: Request, res: Response) => {
    const grupoId = parseInt(req.params["id"] as string);
    if (isNaN(grupoId)) {
      res.status(400).json({ error: "ID de grupo inválido" });
      return;
    }

    const { diaSemana, horaInicio } = req.body as { diaSemana?: number; horaInicio?: string };
    if (diaSemana === undefined || !horaInicio) {
      res.status(400).json({ error: "diaSemana y horaInicio requeridos" });
      return;
    }

    const horario = await prisma.horarioClase.create({
      data: { grupoId, diaSemana, horaInicio },
    });
    res.status(201).json(horario);
  }
);

export default router;
