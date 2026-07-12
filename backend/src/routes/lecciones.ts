import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyAlumnoJWT, optionalAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { tieneSuscripcionActiva } from "../lib/suscripciones";
import { emitirCertificadoOnlineSiCorresponde } from "../lib/certificados-online";
import { leccionContenidoSchema } from "../lib/leccion-contenido.schema";

const router = Router();

const PUNTAJE_MIN = 0;
const PUNTAJE_MAX = 100;

// PUT /api/lecciones/:id/content — admin: guarda el contenido interactivo (LessonPlayer)
router.put(
  "/:id/content",
  verifyJWT,
  auditLog("GUARDAR_CONTENIDO_LECCION", "lecciones"),
  async (req: Request, res: Response) => {
    const leccionId = parseInt(req.params["id"] as string);
    if (isNaN(leccionId)) {
      res.status(400).json({ error: "ID de lección inválido" });
      return;
    }

    const parsed = leccionContenidoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Contenido inválido",
        detalles: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      return;
    }

    const leccion = await prisma.leccion.findUnique({ where: { id: leccionId } });
    if (!leccion) {
      res.status(404).json({ error: "Lección no encontrada" });
      return;
    }

    await prisma.leccion.update({
      where: { id: leccionId },
      data: { content: parsed.data },
    });

    res.json({ ok: true, pasos: parsed.data.pasos.length });
  }
);

// GET /api/lecciones/:id/jugar — contenido interactivo, mismo gating que /completar
router.get("/:id/jugar", optionalAlumnoJWT, async (req: Request, res: Response) => {
  const leccionId = parseInt(req.params["id"] as string);
  if (isNaN(leccionId)) {
    res.status(400).json({ error: "ID de lección inválido" });
    return;
  }

  const leccion = await prisma.leccion.findUnique({
    where: { id: leccionId },
    select: { id: true, titulo: true, esGratis: true, content: true },
  });

  if (!leccion) {
    res.status(404).json({ error: "Lección no encontrada" });
    return;
  }

  if (!leccion.content) {
    res.status(404).json({ error: "Esta lección no tiene contenido interactivo" });
    return;
  }

  if (!leccion.esGratis) {
    const alumnoId = req.alumno?.alumnoId;
    if (!alumnoId) {
      res.status(401).json({ error: "Iniciá sesión para jugar esta lección" });
      return;
    }
    const desbloqueada = await tieneSuscripcionActiva(alumnoId);
    if (!desbloqueada) {
      res.status(403).json({ error: "Esta lección requiere una suscripción activa" });
      return;
    }
  }

  res.json({ id: leccion.id, titulo: leccion.titulo, contenido: leccion.content });
});

// POST /api/lecciones/:id/completar — marca la lección completada (+ puntaje opcional)
router.post("/:id/completar", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const leccionId = parseInt(req.params["id"] as string);
  if (isNaN(leccionId)) {
    res.status(400).json({ error: "ID de lección inválido" });
    return;
  }

  const { puntaje } = req.body as { puntaje?: number };
  if (puntaje !== undefined) {
    if (typeof puntaje !== "number" || !Number.isInteger(puntaje) || puntaje < PUNTAJE_MIN || puntaje > PUNTAJE_MAX) {
      res.status(400).json({ error: `puntaje debe ser un entero entre ${PUNTAJE_MIN} y ${PUNTAJE_MAX}` });
      return;
    }
  }

  const leccion = await prisma.leccion.findUnique({
    where: { id: leccionId },
    include: { capitulo: { select: { cursoOnlineId: true } } },
  });

  if (!leccion) {
    res.status(404).json({ error: "Lección no encontrada" });
    return;
  }

  const alumnoId = req.alumno!.alumnoId;

  if (!leccion.esGratis) {
    const desbloqueada = await tieneSuscripcionActiva(alumnoId);
    if (!desbloqueada) {
      res.status(403).json({ error: "Esta lección requiere una suscripción activa" });
      return;
    }
  }

  // Auto-inscripción: al completar una lección de un curso todavía no
  // "empezado" formalmente (llegó vía una Ruta curada, no vía el botón
  // "Inscribirme" del CursoOnline) se crea la InscripcionOnline para que
  // el progreso aparezca en /mis-cursos sin pasos extra.
  await prisma.inscripcionOnline.upsert({
    where: {
      alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId: leccion.capitulo.cursoOnlineId },
    },
    create: { alumnoId, cursoOnlineId: leccion.capitulo.cursoOnlineId },
    update: {},
  });

  const progreso = await prisma.progresoLeccion.upsert({
    where: { alumnoId_leccionId: { alumnoId, leccionId } },
    create: {
      alumnoId,
      leccionId,
      completada: true,
      puntaje: puntaje ?? null,
      completadaEn: new Date(),
    },
    update: {
      completada: true,
      puntaje: puntaje ?? undefined,
      completadaEn: new Date(),
    },
  });

  const certificado = await emitirCertificadoOnlineSiCorresponde(
    alumnoId,
    leccion.capitulo.cursoOnlineId
  );

  res.json({
    progreso,
    certificado: certificado
      ? { codigo: certificado.codigo, puntaje: certificado.puntaje, urlPdf: certificado.urlPdf }
      : null,
  });
});

export default router;
