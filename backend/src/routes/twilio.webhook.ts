import { Router, type Request, type Response } from "express";
import { verifyTwilioSignature } from "../middleware/twilio-webhook.middleware";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { sendTwilioWhatsApp } from "../lib/twilio-send";
import { activarModoHumano, desactivarModoHumano } from "../lib/human-handoff";
import { log } from "../lib/logger";
import prisma from "../lib/prisma";

const router = Router();

// Formato para que el admin responda al cliente:  [+502XXXXXXXX] texto
const REPLY_RE   = /^\[(\+?\d{7,15})\]\s*([\s\S]+)$/;
// Formato para reactivar el bot:                  /bot [+502XXXXXXXX]
const BOT_RE     = /^\/bot\s+\[(\+?\d{7,15})\]$/i;
// Sin número — el admin escribe libremente (ayuda)
const HELP_MSG   =
  "📋 *Comandos disponibles:*\n" +
  "• Responder a un cliente:\n  `[+502XXXXXXXX] Tu mensaje`\n" +
  "• Reactivar el bot para un cliente:\n  `/bot [+502XXXXXXXX]`";

async function guardarMensajeAsesor(telefono: string, contenido: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { telefono } });
    if (!lead) return;
    const conv = await prisma.conversacionWhatsApp.findFirst({
      where: { telefono },
      orderBy: { creadoEn: "desc" },
    });
    if (!conv) return;
    await prisma.mensajeWhatsApp.create({
      data: { conversacionId: conv.id, rol: "asesor", contenido },
    });
  } catch {
    // falla silenciosa
  }
}

// Twilio envía form-urlencoded — el parser se monta en index.ts antes de esta ruta
router.post("/", verifyTwilioSignature, async (req: Request, res: Response) => {
  // Responder 200 inmediatamente (Twilio reenvía si no recibe 200 en <15s)
  res.status(200).send("");

  const { From, Body } = req.body as { From?: string; Body?: string };
  if (!From || !Body) return;

  const adminPhone = process.env.ADMIN_TWILIO_WHATSAPP;
  const mensaje    = Body.trim();

  log("info", `[Twilio] Admin msg: "${mensaje.slice(0, 80)}"`);

  // --- Formato: /bot [+502XXXXXXXX] ---
  const botMatch = mensaje.match(BOT_RE);
  if (botMatch) {
    const clientePhone = botMatch[1].replace(/^\+/, "");
    await desactivarModoHumano(clientePhone);
    log("info", `[Twilio] Bot reactivado para ${clientePhone}`);
    if (adminPhone) {
      await sendTwilioWhatsApp(
        adminPhone,
        `✅ Bot reactivado para +${clientePhone}`
      ).catch(() => {});
    }
    return;
  }

  // --- Formato: [+502XXXXXXXX] texto ---
  const replyMatch = mensaje.match(REPLY_RE);
  if (replyMatch) {
    const clientePhone = replyMatch[1].replace(/^\+/, "");
    const texto        = replyMatch[2].trim();

    // Silenciar el bot para esta conversación
    await activarModoHumano(clientePhone);

    // Enviar respuesta al cliente por WhatsApp (via Meta)
    const sent = await sendWhatsAppMessage(clientePhone, texto);

    if (sent.success) {
      log("info", `[Twilio] Asesor respondió a +${clientePhone} — ID: ${sent.messageId}`);
      await guardarMensajeAsesor(clientePhone, texto);
      if (adminPhone) {
        await sendTwilioWhatsApp(
          adminPhone,
          `✅ Mensaje enviado a +${clientePhone}`
        ).catch(() => {});
      }
    } else {
      log("error", `[Twilio] Error enviando a +${clientePhone}: ${sent.error}`);
      if (adminPhone) {
        await sendTwilioWhatsApp(
          adminPhone,
          `❌ Error enviando a +${clientePhone}: ${sent.error}`
        ).catch(() => {});
      }
    }
    return;
  }

  // --- Mensaje sin formato reconocido → mostrar ayuda ---
  if (adminPhone) {
    await sendTwilioWhatsApp(adminPhone, HELP_MSG).catch(() => {});
  }
});

export default router;
