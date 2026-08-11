import { Router, Request, Response } from "express";
import { verifyMetaHmac } from "../middleware/hmac.middleware";
import { rateLimitWhatsApp } from "../middleware/rate-limit.middleware";
import { responderMensaje } from "../lib/claude";
import { guardarMensajes } from "../lib/persistence";
import { sendWhatsAppMessage, descargarMediaWhatsApp } from "../lib/whatsapp-send";
import { subirArchivoR2 } from "../lib/storage";
import { notifyAdminNewLead } from "../services/notifications";
import prisma from "../lib/prisma";
import { desactivarModoHumano } from "../lib/human-handoff";
import { isAdvisorPhone, handleAdvisorMessage } from "../lib/advisor-commands";
import { notifyAdvisorConversacion } from "../lib/advisor-notify";
import { log } from "../lib/logger";

const router = Router();

const MENSAJE_ERROR = "Lo siento, hubo un error. Un asesor se pondrá en contacto pronto.";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

interface MetaMedia {
  id: string;
  mime_type?: string;
  caption?: string;
}

interface MetaMessage {
  from: string;
  text?: { body: string };
  image?: MetaMedia;
  document?: MetaMedia;
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

// Imagen o documento (comprobante de pago, etc.): se descarga de Meta, se
// sube a R2 para tener una URL permanente, y se persiste/notifica igual que
// un mensaje de texto — antes se perdía en silencio (ver `type !== "text"`).
async function procesarMensajeMedia(msg: MetaMessage, telefono: string, mask: string): Promise<void> {
  const media = msg.image ?? msg.document;
  if (!media) return;

  const tipoLabel = msg.type === "image" ? "imagen" : "documento";
  log("info", `[WhatsApp] ${mask} | ${tipoLabel} recibido (media_id: ${media.id})`);

  const descarga = await descargarMediaWhatsApp(media.id);
  let mediaUrl: string | undefined;

  if (descarga) {
    const ext = MIME_EXTENSIONS[descarga.mimeType] ?? "";
    mediaUrl = await subirArchivoR2(`whatsapp-media/${telefono}/${media.id}${ext}`, descarga.buffer, descarga.mimeType);
  }

  if (!mediaUrl) {
    log("error", `[WhatsApp] ${mask} | No se pudo descargar/subir ${tipoLabel} (media_id: ${media.id})`);
  }

  let contenido = mediaUrl ? `[${tipoLabel}] ${mediaUrl}` : `[${tipoLabel} recibido — no se pudo guardar]`;
  if (media.caption) contenido += ` — "${media.caption}"`;

  const respuesta = `¡Gracias! Recibimos tu ${tipoLabel} y un asesor lo va a revisar en breve. 🙌`;

  const { isNewLead } = await guardarMensajes(telefono, contenido, respuesta).catch((err) => {
    log("error", `[WhatsApp] ${mask} | Error persistiendo ${tipoLabel}:`, err);
    return { isNewLead: false };
  });

  if (isNewLead) {
    notifyAdminNewLead(telefono, contenido).catch((err) =>
      log("error", `[WhatsApp] ${mask} | Error notificando nuevo lead:`, err)
    );
  }

  const sent = await sendWhatsAppMessage(telefono, respuesta);
  if (!sent.success) {
    log("error", `[WhatsApp] ${mask} | Error enviando confirmación de ${tipoLabel}: ${sent.error}`);
  }

  const aviso =
    `💰 *[+${telefono}] envió un ${tipoLabel}*` +
    (media.caption ? `\n📝 "${media.caption}"` : "") +
    (mediaUrl ? `\n${mediaUrl}` : "\n⚠️ No se pudo guardar el archivo — revisar directamente en WhatsApp.");
  notifyAdvisorConversacion(aviso, mediaUrl).catch((err) =>
    log("error", `[WhatsApp] ${mask} | Error notificando ${tipoLabel} al asesor:`, err)
  );
}

// Cualquier otro tipo no manejado explícitamente (audio, video, sticker,
// ubicación, contacto, respuesta interactiva...): igual se persiste y se
// avisa, en vez de descartarse sin dejar rastro.
async function procesarMensajeNoSoportado(msg: MetaMessage, telefono: string, mask: string): Promise<void> {
  log("info", `[WhatsApp] ${mask} | mensaje tipo "${msg.type}" no soportado`);

  const contenido = `[mensaje tipo: ${msg.type}]`;
  const respuesta = "Recibimos tu mensaje. Un asesor lo va a revisar y te responde en breve.";

  const { isNewLead } = await guardarMensajes(telefono, contenido, respuesta).catch((err) => {
    log("error", `[WhatsApp] ${mask} | Error persistiendo mensaje tipo "${msg.type}":`, err);
    return { isNewLead: false };
  });

  if (isNewLead) {
    notifyAdminNewLead(telefono, contenido).catch((err) =>
      log("error", `[WhatsApp] ${mask} | Error notificando nuevo lead:`, err)
    );
  }

  await sendWhatsAppMessage(telefono, respuesta);

  notifyAdvisorConversacion(
    `📩 *[+${telefono}]* envió un mensaje tipo "${msg.type}" — revisar directamente en WhatsApp.`
  ).catch((err) => log("error", `[WhatsApp] ${mask} | Error notificando tipo no soportado:`, err));
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
    const telefono = msg.from;
    const mask = maskPhone(telefono);

    // El asesor solo manda comandos de texto — un adjunto suyo no es un
    // lead nuevo, se ignora en vez de generarle una auto-respuesta.
    if (isAdvisorPhone(telefono) && msg.type !== "text") {
      log("info", `[WhatsApp] ${mask} | mensaje tipo "${msg.type}" del asesor — ignorado`);
      continue;
    }

    if (msg.type === "image" || msg.type === "document") {
      await procesarMensajeMedia(msg, telefono, mask);
      continue;
    }

    if (msg.type !== "text" || !msg.text?.body) {
      await procesarMensajeNoSoportado(msg, telefono, mask);
      continue;
    }

    const mensaje = msg.text.body;

    // Mensajes del asesor (Mirce) al número del bot: son comandos de gestión
    // ([+número] texto → responder al lead · /bot [+número] → reactivar bot),
    // NUNCA van a Claude. La confirmación le vuelve por este mismo chat.
    if (isAdvisorPhone(telefono)) {
      log("info", `[WhatsApp] ${mask} | comando de asesor: "${mensaje.slice(0, 60)}"`);
      await handleAdvisorMessage(mensaje, (texto) => sendWhatsAppMessage(telefono, texto));
      continue;
    }

    // 55.7: /bot — asesor reactiva el bot manualmente
    if (mensaje.trim() === "/bot") {
      await desactivarModoHumano(telefono);
      await sendWhatsAppMessage(telefono, "Bot reactivado ✅ Volviendo a modo automático.");
      log("info", `[WhatsApp] ${mask} | Bot reactivado por comando /bot`);
      // Marcar escalación como resuelta
      prisma.escalacionLog.updateMany({
        where: { telefono, resueltaEn: null },
        data: { resueltaEn: new Date(), resolvidaPor: "asesor-whatsapp" },
      }).catch(() => {});
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

    // Enviar respuesta por WhatsApp (modo humano devuelve "" — no enviar vacío)
    if (respuesta) {
      const sent = await sendWhatsAppMessage(telefono, respuesta);
      if (sent.success) {
        log("info", `[WhatsApp] ${mask} | Respuesta enviada — ID: ${sent.messageId}`);
      } else {
        log("error", `[WhatsApp] ${mask} | Error enviando mensaje: ${sent.error}`);
      }
    }

    // Forwarding en tiempo real al asesor (Meta + Twilio) — así lleva
    // control de la conversación completa, mensaje por mensaje.
    if (respuesta) {
      notifyAdvisorConversacion(
        `📩 *[+${telefono}]*\n👤 "${mensaje.slice(0, 120)}"\n🤖 "${respuesta.slice(0, 200)}"`
      ).catch((err) => log("error", `[WhatsApp] ${mask} | Error forwarding al asesor:`, err));
    }
  }
});

export default router;
