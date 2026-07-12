import { Router, Request, Response, NextFunction } from "express";
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

const router = Router();

const JOIN_MAX_POR_MINUTO = 10;
const JOIN_WINDOW_MS = 60_000;
const joinAttempts = new Map<number, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of joinAttempts.entries()) {
    if (entry.resetAt < now) joinAttempts.delete(key);
  }
}, 300_000);

function rateLimitJoin(req: Request, res: Response, next: NextFunction): void {
  const alumnoId = req.alumno!.alumnoId;
  const now = Date.now();
  const entry = joinAttempts.get(alumnoId);

  if (!entry || entry.resetAt < now) {
    joinAttempts.set(alumnoId, { count: 1, resetAt: now + JOIN_WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > JOIN_MAX_POR_MINUTO) {
    res.status(429).json({ error: "Demasiados intentos. Esperá un minuto." });
    return;
  }
  next();
}

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
    const { slug, nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos } = req.body as {
      slug?: string;
      nombre?: string;
      audiencia?: string;
      niveles?: string;
      descripcion?: string;
      profesor?: string;
      urlZoom?: string;
      duracionMinutos?: number;
    };

    if (!slug || !nombre || !audiencia || !niveles || !urlZoom) {
      res.status(400).json({ error: "Faltan campos requeridos: slug, nombre, audiencia, niveles, urlZoom" });
      return;
    }

    const grupo = await prisma.grupoClaseEnVivo.create({
      data: { slug, nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos },
    });
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

    const { nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos, activo } = req.body as {
      nombre?: string;
      audiencia?: string;
      niveles?: string;
      descripcion?: string;
      profesor?: string;
      urlZoom?: string;
      duracionMinutos?: number;
      activo?: boolean;
    };

    const grupo = await prisma.grupoClaseEnVivo.update({
      where: { id },
      data: { nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos, activo },
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
