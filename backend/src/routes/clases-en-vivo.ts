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

// vuln_021: antes solo se chequeaba que diaSemana y horaInicio vinieran presentes,
// sin validar formato/rango — Prisma los persistía tal cual (ej. diaSemana: -1 o 99,
// horaInicio: "no-es-una-hora"). Mismo rango que documenta el modelo HorarioClase.
export const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "horaInicio debe ser HH:mm (24h)"),
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

    const parsed = horarioSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "diaSemana y horaInicio inválidos" });
      return;
    }

    const horario = await prisma.horarioClase.create({
      data: { grupoId, diaSemana: parsed.data.diaSemana, horaInicio: parsed.data.horaInicio },
    });
    res.status(201).json(horario);
  }
);

// GET /api/clases-en-vivo/admin/grupos — selector de grupos para la vista de
// asistencia (PRD mea-logica-negocio R5). A diferencia de /horario (público),
// incluye grupos inactivos para poder revisar historial.
router.get("/admin/grupos", verifyJWT, async (_req: Request, res: Response) => {
  const grupos = await prisma.grupoClaseEnVivo.findMany({
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, audiencia: true, niveles: true, profesor: true, activo: true },
  });
  res.json(grupos);
});

// GET /api/clases-en-vivo/:id/sesiones — asistencia real por sesion de un grupo
// (R5). No existe hoy una relacion explicita alumno-grupo (un alumno no se
// inscribe formalmente a un GrupoClaseEnVivo), asi que esta vista no muestra
// "quien estaba esperado" -- solo quien asistio de verdad, para no inventar un
// roster que no existe en la base de datos.
router.get("/:id/sesiones", verifyJWT, async (req: Request, res: Response) => {
  const grupoId = parseInt(req.params["id"] as string);
  if (isNaN(grupoId)) {
    res.status(400).json({ error: "ID de grupo inválido" });
    return;
  }

  const grupo = await prisma.grupoClaseEnVivo.findUnique({
    where: { id: grupoId },
    select: { id: true, nombre: true },
  });
  if (!grupo) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  const sesiones = await prisma.sesionClase.findMany({
    where: { grupoId },
    orderBy: { fechaHora: "desc" },
    take: 60,
    include: {
      asistencias: {
        where: { asistio: true },
        include: { alumno: { select: { id: true, nombre: true, apellido: true, email: true } } },
      },
    },
  });

  res.json({
    grupo,
    sesiones: sesiones.map((s) => ({
      id: s.id,
      fechaHora: s.fechaHora,
      estado: s.estado,
      asistentes: s.asistencias.map((a) => ({
        alumnoId: a.alumno.id,
        nombre: a.alumno.nombre,
        apellido: a.alumno.apellido,
        email: a.alumno.email,
        fuente: a.fuente,
      })),
    })),
  });
});

// POST /api/clases-en-vivo/sesiones/:sesionId/asistencia — marcado manual
// (R2b). No existe un roster de "alumnos esperados" por sesion (ver nota en
// GET /:id/sesiones), asi que el profesor/admin busca al alumno por nombre o
// email (GET /api/alumnos?search=) y marca lo que observo en la clase, en vez
// de tildar una lista generada por el sistema.
const marcarAsistenciaSchema = z.object({
  alumnoId: z.number().int().positive(),
  asistio: z.boolean(),
});

router.post(
  "/sesiones/:sesionId/asistencia",
  verifyJWT,
  auditLog("MARCAR_ASISTENCIA_MANUAL", "clases-en-vivo"),
  async (req: Request, res: Response) => {
    const sesionId = parseInt(req.params["sesionId"] as string);
    if (isNaN(sesionId)) {
      res.status(400).json({ error: "ID de sesión inválido" });
      return;
    }

    const parsed = marcarAsistenciaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "alumnoId y asistio son requeridos" });
      return;
    }

    const sesion = await prisma.sesionClase.findUnique({ where: { id: sesionId } });
    if (!sesion) {
      res.status(404).json({ error: "Sesión no encontrada" });
      return;
    }

    const alumno = await prisma.alumno.findUnique({ where: { id: parsed.data.alumnoId } });
    if (!alumno) {
      res.status(404).json({ error: "Alumno no encontrado" });
      return;
    }

    const asistencia = await prisma.asistenciaSesion.upsert({
      where: { alumnoId_sesionId: { alumnoId: parsed.data.alumnoId, sesionId } },
      create: { alumnoId: parsed.data.alumnoId, sesionId, asistio: parsed.data.asistio, fuente: "manual" },
      update: { asistio: parsed.data.asistio, fuente: "manual", marcadoEn: new Date() },
    });

    res.json(asistencia);
  }
);

export default router;
