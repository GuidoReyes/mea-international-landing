import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { log } from "../lib/logger";
import { verificarFirmaWebhook, agregarMeses } from "../lib/recurrente";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { inscribirEnCursosPublicados } from "../lib/suscripciones";

const router = Router();

// Eventos de pago exitoso que activan la suscripción
const EVENTOS_PAGO_EXITOSO = new Set([
  "payment_intent.succeeded",
  "checkout.completed",
  "subscription.paid",
]);

interface WebhookRecurrente {
  id?: string;
  event_type?: string;
  type?: string;
  checkout?: { id?: string; metadata?: Record<string, string> };
  metadata?: Record<string, string>;
  payment?: { id?: string };
}

function extraerSuscripcionId(payload: WebhookRecurrente): number | null {
  const valor = payload.metadata?.suscripcion_id ?? payload.checkout?.metadata?.suscripcion_id;
  const id = valor ? parseInt(valor, 10) : NaN;
  return isNaN(id) ? null : id;
}

// POST /api/webhooks/recurrente
router.post("/", async (req: Request, res: Response) => {
  const secret = process.env.RECURRENTE_WEBHOOK_SECRET;
  if (!secret) {
    log("error", "[WebhookRecurrente] RECURRENTE_WEBHOOK_SECRET no configurado");
    res.status(503).json({ error: "Webhook no configurado" });
    return;
  }

  const firmaValida = verificarFirmaWebhook(
    req.rawBody ?? "",
    {
      id: req.headers["svix-id"] as string | undefined,
      timestamp: req.headers["svix-timestamp"] as string | undefined,
      signature: req.headers["svix-signature"] as string | undefined,
    },
    secret
  );

  if (!firmaValida) {
    log("warn", "[WebhookRecurrente] Firma inválida — evento rechazado");
    res.status(401).json({ error: "Firma inválida" });
    return;
  }

  const payload = req.body as WebhookRecurrente;
  const tipoEvento = payload.event_type ?? payload.type ?? "";

  if (!EVENTOS_PAGO_EXITOSO.has(tipoEvento)) {
    // Evento que no nos interesa: confirmar recepción para que no reintente
    res.json({ received: true });
    return;
  }

  const suscripcionId = extraerSuscripcionId(payload);
  if (!suscripcionId) {
    log("warn", `[WebhookRecurrente] Evento ${tipoEvento} sin metadata.suscripcion_id`);
    res.json({ received: true });
    return;
  }

  const idExternoEvento = payload.payment?.id ?? payload.id ?? `evt-${suscripcionId}-${tipoEvento}`;

  // Idempotencia: si ya registramos este pago, no repetir
  const pagoExistente = await prisma.pagoSuscripcion.findFirst({
    where: { idExterno: idExternoEvento },
  });
  if (pagoExistente) {
    res.json({ received: true, duplicado: true });
    return;
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: suscripcionId },
    include: { planPrecio: { include: { plan: true } }, alumno: true },
  });
  if (!suscripcion) {
    log("warn", `[WebhookRecurrente] Suscripción ${suscripcionId} no encontrada`);
    res.json({ received: true });
    return;
  }

  const ahora = new Date();
  const fechaFin = agregarMeses(ahora, suscripcion.planPrecio.duracionMeses);

  await prisma.$transaction([
    prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { estado: "ACTIVA", fechaInicio: ahora, fechaFin },
    }),
    prisma.pagoSuscripcion.create({
      data: {
        suscripcionId: suscripcion.id,
        montoCentavos: suscripcion.planPrecio.precioTotalCentavos,
        moneda: suscripcion.planPrecio.moneda,
        estado: "COMPLETADO",
        proveedor: "recurrente",
        idExterno: idExternoEvento,
        pagadoEn: ahora,
      },
    }),
  ]);

  log("info", `[WebhookRecurrente] Suscripción ${suscripcion.id} activada hasta ${fechaFin.toISOString()}`);

  await inscribirEnCursosPublicados(suscripcion.alumnoId);

  if (suscripcion.alumno.whatsapp) {
    const mensaje =
      `¡Hola ${suscripcion.alumno.nombre}! Tu plan ${suscripcion.planPrecio.plan.nombre} ` +
      `de ${suscripcion.planPrecio.duracionMeses} ${suscripcion.planPrecio.duracionMeses === 1 ? "mes" : "meses"} ` +
      `ya está activo. Entrá a tus cursos en https://www.mea.edu.gt/mis-cursos 🎓`;
    sendWhatsAppMessage(suscripcion.alumno.whatsapp, mensaje).catch((err) =>
      log("error", "[WebhookRecurrente] Error enviando WhatsApp de confirmación:", err)
    );
  }

  res.json({ received: true });
});

export default router;
