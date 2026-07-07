// Comandos del asesor (Mirce) para atender leads escalados desde su WhatsApp
// personal, escribiendo al número del bot (canal Meta):
//
//   [+502XXXXXXXX] texto   → reenvía "texto" al lead desde el número del bot
//                            (y silencia el bot para esa conversación)
//   /bot [+502XXXXXXXX]    → reactiva el bot para ese lead
//
// Mismo formato que ya usa el canal Twilio (twilio.webhook.ts). La respuesta
// del asesor viaja dentro de la ventana de 24h del lead (acaba de escribir),
// por lo que NO requiere plantilla de Meta.
import { sendWhatsAppMessage } from "./whatsapp-send";
import { activarModoHumano, desactivarModoHumano } from "./human-handoff";
import { log } from "./logger";
import prisma from "./prisma";

const REPLY_RE = /^\[(\+?\d{7,15})\]\s*([\s\S]+)$/;
const BOT_RE = /^\/bot\s+\[(\+?\d{7,15})\]$/i;

const HELP_MSG =
  "📋 *Comandos disponibles:*\n" +
  "• Responder a un cliente:\n  `[+502XXXXXXXX] Tu mensaje`\n" +
  "• Reactivar el bot para un cliente:\n  `/bot [+502XXXXXXXX]`";

function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

/** True si el mensaje entrante viene del teléfono personal del asesor. */
export function isAdvisorPhone(telefono: string): boolean {
  const advisor = soloDigitos(process.env.MIRCE_PERSONAL_PHONE ?? "");
  if (!advisor) return false;
  return soloDigitos(telefono) === advisor;
}

async function guardarMensajeAsesor(telefono: string, contenido: string): Promise<void> {
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
    // falla silenciosa — el guardado del historial no debe frenar el envío
  }
}

/**
 * Procesa un mensaje del asesor. `notify` envía la confirmación/ayuda de
 * vuelta al asesor por el canal en que escribió (Meta o Twilio).
 */
export async function handleAdvisorMessage(
  mensaje: string,
  notify: (texto: string) => Promise<unknown>
): Promise<void> {
  const texto = mensaje.trim();

  // --- /bot [+502XXXXXXXX] → reactivar el bot para ese lead ---
  const botMatch = texto.match(BOT_RE);
  if (botMatch) {
    const clientePhone = soloDigitos(botMatch[1]);
    await desactivarModoHumano(clientePhone);
    prisma.escalacionLog.updateMany({
      where: { telefono: clientePhone, resueltaEn: null },
      data: { resueltaEn: new Date(), resolvidaPor: "asesor-whatsapp" },
    }).catch(() => {});
    log("info", `[Advisor] Bot reactivado para XXX-${clientePhone.slice(-4)}`);
    await notify(`✅ Bot reactivado para +${clientePhone}`).catch(() => {});
    return;
  }

  // --- [+502XXXXXXXX] texto → responder al lead desde el número del bot ---
  const replyMatch = texto.match(REPLY_RE);
  if (replyMatch) {
    const clientePhone = soloDigitos(replyMatch[1]);
    const respuesta = replyMatch[2].trim();

    // El asesor tomó la conversación: el bot se mantiene callado
    await activarModoHumano(clientePhone);

    const sent = await sendWhatsAppMessage(clientePhone, respuesta);
    if (sent.success) {
      log("info", `[Advisor] Respuesta enviada a XXX-${clientePhone.slice(-4)} — ID: ${sent.messageId}`);
      await guardarMensajeAsesor(clientePhone, respuesta);
      await notify(`✅ Mensaje enviado a +${clientePhone}`).catch(() => {});
    } else {
      log("error", `[Advisor] Error enviando a XXX-${clientePhone.slice(-4)}: ${sent.error}`);
      await notify(`❌ Error enviando a +${clientePhone}: ${sent.error}`).catch(() => {});
    }
    return;
  }

  // --- Sin formato reconocido → ayuda ---
  await notify(HELP_MSG).catch(() => {});
}
