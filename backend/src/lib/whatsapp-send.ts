import { log } from "./logger";

const GRAPH_API_VERSION = "v21.0";
const MAX_RETRIES = 3;

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface GraphApiResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code: number };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<SendResult> {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    log("error", "[WhatsApp] META_PHONE_ID o META_WHATSAPP_TOKEN no configurados");
    return { success: false, error: "Missing credentials" };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`;
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });

      const data = (await response.json()) as GraphApiResponse;

      if (response.ok && data.messages?.[0]?.id) {
        const messageId = data.messages[0].id;
        log("info", `[WhatsApp] Mensaje enviado a ${to} — ID: ${messageId}`);
        return { success: true, messageId };
      }

      const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
      log("error", `[WhatsApp] Error en intento ${attempt}/${MAX_RETRIES}: ${errorMsg}`);

      // No reintentar si el error es del cliente (número inválido, token vencido, etc.)
      if (response.status === 400 || response.status === 401 || response.status === 404) {
        return { success: false, error: errorMsg };
      }

      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500); // 1s, 2s entre reintentos
      }
    } catch (err) {
      log("error", `[WhatsApp] Error de red en intento ${attempt}/${MAX_RETRIES}:`, err);
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500);
      }
    }
  }

  return { success: false, error: "Max retries reached" };
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  params: string[] = []
): Promise<SendResult> {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    log("error", "[WhatsApp] META_PHONE_ID o META_WHATSAPP_TOKEN no configurados");
    return { success: false, error: "Missing credentials" };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`;
  const components =
    params.length > 0
      ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
      : [];

  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es" },
      components,
    },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });

      const data = (await response.json()) as GraphApiResponse;

      if (response.ok && data.messages?.[0]?.id) {
        const messageId = data.messages[0].id;
        log("info", `[WhatsApp] Template '${templateName}' enviado a ${to} — ID: ${messageId}`);
        return { success: true, messageId };
      }

      const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
      log("error", `[WhatsApp] Error template en intento ${attempt}/${MAX_RETRIES}: ${errorMsg}`);

      if (response.status === 400 || response.status === 401 || response.status === 404) {
        return { success: false, error: errorMsg };
      }

      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500);
      }
    } catch (err) {
      log("error", `[WhatsApp] Error de red (template) en intento ${attempt}/${MAX_RETRIES}:`, err);
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500);
      }
    }
  }

  return { success: false, error: "Max retries reached" };
}
