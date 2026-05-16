import { Router, Request, Response } from "express";
import { verifyMetaHmac } from "../middleware/hmac.middleware";
import { rateLimitWhatsApp } from "../middleware/rate-limit.middleware";
import { responderMensaje } from "../lib/claude";
import { guardarMensajes } from "../lib/persistence";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { notifyAdminNewLead } from "../services/notifications";
import { desactivarModoHumano } from "../lib/human-handoff";
import { log } from "../lib/logger";

const router = Router();

const MENSAJE_ERROR = "Lo siento, hubo un error. Un asesor se pondrá en contacto pronto.";

interface MetaMessage {
  from: string;
  text?: { body: string };
  type: string;
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: MetaMessage[] };
    }>;
  }>;
}

function maskPhone(telefono: string) {
  return `XXX-${telefono.slice(-4)}`;
}

// GET — verificación de webhook por Meta
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    log("info", "[WhatsApp] Webhook verificado por Meta");
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: "Verificación fallida" });
});

// POST — recibir y procesar mensajes de WhatsApp
router.post("/", rateLimitWhatsApp, verifyMetaHmac, async (req: Request, res: Response) => {
  // Responder 200 a Meta inmediatamente (requerido en <20s)
  res.status(200).send("OK");

  const body = req.body as MetaWebhookBody;
  const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) return;

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.text?.body) continue;

    const telefono = msg.from;
    const mensaje = msg.text.body;
    const mask = maskPhone(telefono);

    // 55.7: /bot — asesor reactiva el bot manualmente
    if (mensaje.trim() === "/bot") {
      await desactivarModoHumano(telefono);
      await sendWhatsAppMessage(telefono, "Bot reactivado ✅ Volviendo a modo automático.");
      log("info", `[WhatsApp] ${mask} | Bot reactivado por comando /bot`);
      continue;
    }

    log("info", `[WhatsApp] ${mask} | mensaje recibido: "${mensaje.slice(0, 60)}"`);

    let respuesta: string;

    try {
      respuesta = await responderMensaje(telefono, mensaje);
      log("info", `[WhatsApp] ${mask} | Claude respondió (${respuesta.length} chars)`);
    } catch (err) {
      log("error", `[WhatsApp] ${mask} | Error en Claude:`, err);
      respuesta = MENSAJE_ERROR;
    }

    // Persistir (falla silenciosa)
    const { isNewLead } = await guardarMensajes(telefono, mensaje, respuesta).catch((err) => {
      log("error", `[WhatsApp] ${mask} | Error persistiendo:`, err);
      return { isNewLead: false };
    });

    // Notificar al admin cuando llega un lead nuevo (fire and forget)
    if (isNewLead) {
      notifyAdminNewLead(telefono, mensaje).catch((err) =>
        log("error", `[WhatsApp] ${mask} | Error notificando nuevo lead:`, err)
      );
    }

    // Enviar respuesta por WhatsApp
    const sent = await sendWhatsAppMessage(telefono, respuesta);
    if (sent.success) {
      log("info", `[WhatsApp] ${mask} | Respuesta enviada — ID: ${sent.messageId}`);
    } else {
      log("error", `[WhatsApp] ${mask} | Error enviando mensaje: ${sent.error}`);
    }
  }
});

export default router;
