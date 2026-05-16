import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { log } from "../lib/logger";

// --- 34.2: MS Graph token cache en memoria ---
interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let msTokenCache: TokenCache | null = null;

async function getMsGraphToken(): Promise<string> {
  if (msTokenCache && Date.now() < msTokenCache.expiresAt) {
    return msTokenCache.token;
  }

  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("MS Graph credentials not configured (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET)");
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`MS Graph token error: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  // 60s de buffer para renovar antes del vencimiento real
  msTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  log("info", "[Notifications] Token MS Graph renovado");
  return msTokenCache.token;
}

// --- 34.3: Email transaccional via MS Graph sendMail ---
export async function sendTransactionalEmail(to: string, subject: string, html: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log("error", "[Notifications] ADMIN_EMAIL no configurado");
    return;
  }

  try {
    const token = await getMsGraphToken();
    const url = `https://graph.microsoft.com/v1.0/users/${adminEmail}/sendMail`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      log("error", `[Notifications] Error enviando email: HTTP ${response.status} — ${text}`);
      return;
    }

    log("info", `[Notifications] Email enviado a ${to}: "${subject}"`);
  } catch (err) {
    log("error", "[Notifications] Error en sendTransactionalEmail:", err);
  }
}

// --- 34.1: Alerta WhatsApp al admin cuando llega un nuevo lead ---
export async function notifyAdminNewLead(telefono: string, primerMensaje: string): Promise<void> {
  const adminWa = process.env.ADMIN_WA_NUMBER;
  if (!adminWa) {
    log("error", "[Notifications] ADMIN_WA_NUMBER no configurado");
    return;
  }

  const preview = primerMensaje.slice(0, 100);
  const message = `🆕 Nuevo lead\n📱 +${telefono}\n💬 ${preview || "Sin mensaje"}`;

  const result = await sendWhatsAppMessage(adminWa, message);
  if (!result.success) {
    log("error", `[Notifications] Error notificando nuevo lead: ${result.error}`);
  }
}
