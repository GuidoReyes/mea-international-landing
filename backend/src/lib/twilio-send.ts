import twilio from "twilio";
import { log } from "./logger";

interface TwilioSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

function getClient() {
  const sid    = process.env.TWILIO_ACCOUNT_SID;
  const token  = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/**
 * Send a WhatsApp message to the admin via Twilio.
 * `to` must be a full E.164 number (e.g. +50256311728). The "whatsapp:" prefix
 * is added internally.
 */
export async function sendTwilioWhatsApp(to: string, body: string): Promise<TwilioSendResult> {
  const client = getClient();
  const from   = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. whatsapp:+14155238886

  if (!client || !from) {
    log("warn", "[Twilio] Credentials not configured — skipping WhatsApp send");
    return { success: false, error: "Twilio not configured" };
  }

  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const msg = await client.messages.create({ from, to: toFormatted, body });
    log("info", `[Twilio] Message sent to ${toFormatted} — SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `[Twilio] Error sending to ${toFormatted}: ${message}`);
    return { success: false, error: message };
  }
}
