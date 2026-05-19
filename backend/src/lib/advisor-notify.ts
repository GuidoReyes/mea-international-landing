import { sendWhatsAppMessage } from "./whatsapp-send";
import { sendTwilioWhatsApp } from "./twilio-send";
import { log } from "./logger";

export type AdvisorNotifIntent =
  | "clase_prueba"
  | "comprobante_pago"
  | "hablar_asesor"
  | "listo_inscribirse"
  | null;

const INTENT_PATTERNS: Array<{ intent: AdvisorNotifIntent; patterns: RegExp }> = [
  {
    intent: "comprobante_pago",
    patterns: /recibo|comprobante|transfer[ei]ncia|depósito|deposito|constancia|pago|pagué|pague|ya pag/i,
  },
  {
    intent: "listo_inscribirse",
    patterns: /me inscribo|quiero inscribirme|voy a inscribirme|lista para inscribir|listo para inscribir|cómo me inscribo|como me inscribo|inscripción|inscripcion/i,
  },
  {
    intent: "clase_prueba",
    patterns: /clase de prueba|clase prueba|prueba gratis|clase gratis|clase trial|quiero probar|probar el curso|antes de inscribir/i,
  },
  {
    intent: "hablar_asesor",
    patterns: /hablar con|hablar a|asesor|asesora|persona real|alguien de|equipo de|agente|me llamen|me contacten/i,
  },
];

const NOTIF_MESSAGES: Record<NonNullable<AdvisorNotifIntent>, string> = {
  clase_prueba: "📚 Un cliente quiere agendar una *clase de prueba*.",
  comprobante_pago: "💰 Un cliente envió o menciona un *comprobante de pago*. Verificá el chat.",
  hablar_asesor: "💬 Un cliente solicita hablar directamente con un *asesor*.",
  listo_inscribirse: "🎓 Un cliente está *listo para inscribirse*. ¡Es momento de cerrar!",
};

export function detectIntent(mensaje: string): AdvisorNotifIntent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.test(mensaje)) return intent;
  }
  return null;
}

export async function notifyAdvisorIfNeeded(
  telefono: string,
  mensaje: string,
  intent: AdvisorNotifIntent
): Promise<void> {
  if (!intent) return;

  const asesorPhone = process.env.MIRCE_PERSONAL_PHONE;
  const adminTwilio = process.env.ADMIN_TWILIO_WHATSAPP;

  if (!asesorPhone && !adminTwilio) {
    log("warn", "[AdvisorNotify] Sin canal configurado (MIRCE_PERSONAL_PHONE / ADMIN_TWILIO_WHATSAPP)");
    return;
  }

  const base = NOTIF_MESSAGES[intent];
  const preview = mensaje.length > 80 ? `${mensaje.slice(0, 80)}…` : mensaje;
  const body = `${base}\n📱 +${telefono}\n💬 "${preview}"`;

  log("info", `[AdvisorNotify] Intent=${intent} → notificando asesor (${telefono.slice(-4)})`);

  if (asesorPhone) {
    sendWhatsAppMessage(asesorPhone, body).catch((err) =>
      log("error", `[AdvisorNotify] Error Meta canal: ${err}`)
    );
  }

  if (adminTwilio) {
    sendTwilioWhatsApp(adminTwilio, body).catch((err) =>
      log("error", `[AdvisorNotify] Error Twilio canal: ${err}`)
    );
  }
}
