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
    // recibo / comprobante / transferencia / depósito / ya pagué / envié el pago
    patterns: /recibo|comprobante|transferencia|deposito|depósito|constancia|ya pag|envié.*pago|mando.*pago|te mando|aquí.*pago|aqui.*pago/i,
  },
  {
    intent: "listo_inscribirse",
    // me inscribo / quiero inscribirme / cómo me inscribo / cuándo empiezo
    patterns: /me inscribo|inscribo|inscribirme|inscripci[oó]n|c[oó]mo.*empez|cu[aá]ndo.*empez|quiero entrar|quiero empezar/i,
  },
  {
    intent: "clase_prueba",
    // clases? de prueba / clase trial / quiero probar / clase gratis / prueba gratis
    patterns: /clases? de prueba|clase.*prueba|prueba.*clase|prueba gratis|clase gratis|clase trial|quiero probar|probar.*curso|antes de inscribir/i,
  },
  {
    intent: "hablar_asesor",
    // hablar con alguien / con un asesor / me llamen / persona real
    patterns: /hablar con|hablar a|un asesor|una asesora|persona real|alguien de|equipo de|me llamen|me contacten|llamarme|hablar directo/i,
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
