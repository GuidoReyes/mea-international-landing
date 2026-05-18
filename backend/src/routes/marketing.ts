import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { log } from "../lib/logger";

const router = Router();

const campanaSchema = z.object({
  nombre: z.string().min(1),
  template: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

function renderTemplate(template: string, lead: { nombre: string | null; interes: string | null }): string {
  return template
    .replace(/\{nombre\}/g, lead.nombre ?? "Cliente")
    .replace(/\{curso\}/g, lead.interes ?? "nuestros cursos");
}

// GET /api/marketing/campanas
router.get("/campanas", verifyJWT, async (_req: Request, res: Response) => {
  const campanas = await prisma.campanaWhatsApp.findMany({
    orderBy: { creadoEn: "desc" },
    include: { _count: { select: { destinatarios: true } } },
  });
  res.json(campanas);
});

// POST /api/marketing/campanas
router.post("/campanas", verifyJWT, auditLog("CREAR_CAMPANA", "marketing"), async (req: Request, res: Response) => {
  const parsed = campanaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }
  const campana = await prisma.campanaWhatsApp.create({
    data: {
      nombre: parsed.data.nombre,
      template: parsed.data.template,
      variables: parsed.data.variables ?? [],
    },
  });
  res.status(201).json(campana);
});

// POST /api/marketing/campanas/:id/enviar
router.post("/campanas/:id/enviar", verifyJWT, auditLog("ENVIAR_CAMPANA", "marketing"), async (req: Request, res: Response) => {
  const campanaId = parseInt(req.params["id"] as string);
  if (isNaN(campanaId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { leadIds } = req.body as { leadIds?: number[] };
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    res.status(400).json({ error: "leadIds requerido (array no vacío)" });
    return;
  }

  const campana = await prisma.campanaWhatsApp.findUnique({ where: { id: campanaId } });
  if (!campana) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
  if (campana.estado !== "BORRADOR") {
    res.status(409).json({ error: "La campaña ya fue enviada o está en proceso" });
    return;
  }

  // Fetch leads and filter those with valid telefono
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, nombre: true, interes: true, telefono: true },
  });

  if (leads.length === 0) {
    res.status(400).json({ error: "Ningún lead válido encontrado" });
    return;
  }

  // Create destinatario records
  await prisma.campanaDestinatario.createMany({
    data: leads.map((l) => ({ campanaId, leadId: l.id })),
    skipDuplicates: true,
  });

  await prisma.campanaWhatsApp.update({
    where: { id: campanaId },
    data: { estado: "ENVIANDO", totalDestinatarios: leads.length },
  });

  res.status(202).json({ message: "Envío iniciado", total: leads.length });

  // Background processing — fire and forget after response
  const CHUNK = 10;
  const DELAY_MS = 200;

  async function processBatch() {
    const template = campana!.template;
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    const pending = await prisma.campanaDestinatario.findMany({
      where: { campanaId, estado: "PENDIENTE" },
      orderBy: { id: "asc" },
    });

    let i = 0;
    const interval = setInterval(async () => {
      const chunk = pending.slice(i, i + CHUNK);
      i += CHUNK;

      if (chunk.length === 0) {
        clearInterval(interval);
        const final = await prisma.campanaWhatsApp.findUnique({ where: { id: campanaId }, select: { enviados: true, errores: true } });
        const estado = (final?.errores ?? 0) > 0 && (final?.enviados ?? 0) === 0 ? "COMPLETADA" : "COMPLETADA";
        await prisma.campanaWhatsApp.update({ where: { id: campanaId }, data: { estado } });
        log("info", `[Marketing] Campaña ${campanaId} completada — enviados: ${final?.enviados}, errores: ${final?.errores}`);
        return;
      }

      await Promise.all(
        chunk.map(async (dest) => {
          const lead = leadMap.get(dest.leadId);
          if (!lead) return;
          try {
            const mensaje = renderTemplate(template, lead);
            const result = await sendWhatsAppMessage(lead.telefono, mensaje);
            if (result.success) {
              await prisma.campanaDestinatario.update({
                where: { id: dest.id },
                data: { estado: "ENVIADO", enviadoEn: new Date() },
              });
              await prisma.campanaWhatsApp.update({
                where: { id: campanaId },
                data: { enviados: { increment: 1 } },
              });
            } else {
              throw new Error(result.error ?? "Error desconocido");
            }
          } catch (err) {
            await prisma.campanaDestinatario.update({
              where: { id: dest.id },
              data: { estado: "ERROR", error: String(err).slice(0, 255) },
            });
            await prisma.campanaWhatsApp.update({
              where: { id: campanaId },
              data: { errores: { increment: 1 } },
            });
          }
        })
      );
    }, DELAY_MS);
  }

  processBatch().catch((err) => log("error", `[Marketing] Error en background send campaña ${campanaId}:`, err));
});

// GET /api/marketing/campanas/:id/status
router.get("/campanas/:id/status", verifyJWT, async (req: Request, res: Response) => {
  const campanaId = parseInt(req.params["id"] as string);
  if (isNaN(campanaId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const campana = await prisma.campanaWhatsApp.findUnique({
    where: { id: campanaId },
    select: { estado: true, totalDestinatarios: true, enviados: true, errores: true },
  });
  if (!campana) { res.status(404).json({ error: "Campaña no encontrada" }); return; }

  const progreso = campana.totalDestinatarios > 0
    ? Math.round((campana.enviados / campana.totalDestinatarios) * 100)
    : 0;

  res.json({ ...campana, progreso });
});

export default router;
