import { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import prisma from "../lib/prisma";
import { estaModoHumano, tiempoRestanteHandoff } from "../lib/human-handoff";

// Bridge de SOLO LECTURA para JARVIS (Mac Studio). Autenticación por token
// interno compartido (JARVIS_BRIDGE_TOKEN) — no es un admin humano, así que
// no pasa por JWT. Los teléfonos salen enmascarados: JARVIS no necesita el
// número completo para resumir ni alertar.

const router = Router();

function jarvisAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.JARVIS_BRIDGE_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "JARVIS_BRIDGE_TOKEN no configurado" });
    return;
  }
  const provided = req.headers["x-jarvis-token"] as string | undefined;
  if (!provided) {
    res.status(403).json({ error: "Falta token" });
    return;
  }
  try {
    const a = Buffer.from(provided.padEnd(expected.length));
    const b = Buffer.from(expected.padEnd(provided.length));
    if (a.length === b.length && timingSafeEqual(a, b)) {
      next();
      return;
    }
  } catch {
    // cae al 403
  }
  res.status(403).json({ error: "Token inválido" });
}

const mask = (telefono: string) => `XXX-${telefono.slice(-4)}`;

// GET /api/jarvis/whatsapp/summary — métricas del día
router.get("/whatsapp/summary", jarvisAuth, async (_req: Request, res: Response) => {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);

  const [mensajesHoy, leadsNuevosHoy, escalacionesAbiertas, escalacionesHoy] = await Promise.all([
    prisma.mensajeWhatsApp.count({ where: { creadoEn: { gte: desde } } }),
    prisma.lead.count({ where: { creadoEn: { gte: desde } } }),
    prisma.escalacionLog.count({ where: { resueltaEn: null } }),
    prisma.escalacionLog.count({ where: { creadoEn: { gte: desde } } }),
  ]);

  res.json({
    fecha: desde.toISOString().slice(0, 10),
    mensajesHoy,
    leadsNuevosHoy,
    escalacionesAbiertas,
    escalacionesHoy,
  });
});

// GET /api/jarvis/whatsapp/pending-humans — escalaciones sin resolver
router.get("/whatsapp/pending-humans", jarvisAuth, async (_req: Request, res: Response) => {
  const abiertas = await prisma.escalacionLog.findMany({
    where: { resueltaEn: null },
    orderBy: { creadoEn: "desc" },
    take: 20,
  });

  const pendientes = await Promise.all(
    abiertas.map(async (e) => ({
      id: e.id,
      telefono: mask(e.telefono),
      motivo: e.motivo,
      desde: e.creadoEn,
      // Si el TTL de Redis expiró, el bot ya retomó aunque la escalación
      // siga sin marcarse resuelta en BD.
      modoHumanoActivo: await estaModoHumano(e.telefono),
      handoffSegundosRestantes: await tiempoRestanteHandoff(e.telefono),
    }))
  );

  res.json({ total: pendientes.length, pendientes });
});

// GET /api/jarvis/whatsapp/conversations?limit=10 — últimas conversaciones
router.get("/whatsapp/conversations", jarvisAuth, async (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

  const convs = await prisma.conversacionWhatsApp.findMany({
    orderBy: { creadoEn: "desc" },
    take: limit,
    include: {
      lead: { select: { nombre: true, estado: true, etapa: { select: { nombre: true } } } },
      mensajes: { orderBy: { creadoEn: "desc" }, take: 6 },
    },
  });

  res.json({
    conversaciones: convs.map((c) => ({
      telefono: mask(c.telefono),
      lead: c.lead?.nombre ?? null,
      estado: c.lead?.estado ?? null,
      etapa: c.lead?.etapa?.nombre ?? null,
      creadoEn: c.creadoEn,
      // en orden cronológico y truncados: JARVIS resume, no necesita el texto entero
      ultimosMensajes: c.mensajes.reverse().map((m) => ({
        rol: m.rol,
        contenido: m.contenido.slice(0, 300),
        creadoEn: m.creadoEn,
      })),
    })),
  });
});

export default router;
