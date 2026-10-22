import { log } from "../lib/logger";
import { stripControlChars } from "../lib/log-sanitize";

// Solo para el reporte de seguridad (tarea #83): Railway bloquea SMTP y no tiene MS Graph
// configurado, así que el reporte sale por la API de Gmail (HTTPS) desde la cuenta que
// autorizó GMAIL_REFRESH_TOKEN (`npx ts-node src/scripts/get-drive-token.ts gmail`).
// Es un token aparte del de Drive: aquel solo tiene el scope drive.file.

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const BASE64_LINE_LENGTH = 76; // RFC 2045

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN
  );
}

// RFC 2047: el asunto viaja en base64, así que un CRLF dentro nunca puede cerrar la cabecera
function encodeHeaderWord(value: string): string {
  return `=?UTF-8?B?${Buffer.from(stripControlChars(value), "utf8").toString("base64")}?=`;
}

function wrapBase64(value: string): string {
  return (value.match(new RegExp(`.{1,${BASE64_LINE_LENGTH}}`, "g")) ?? []).join("\r\n");
}

/** Mensaje RFC 2822 en base64url, el formato que espera gmail.users.messages.send. */
export function buildRawMessage(to: string, subject: string, html: string): string {
  if (!EMAIL_RE.test(to)) throw new Error("Invalid recipient address");

  const mime = [
    `To: ${to}`,
    `Subject: ${encodeHeaderWord(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(html, "utf8").toString("base64")),
  ].join("\r\n");

  return Buffer.from(mime, "utf8").toString("base64url");
}

export async function sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isGmailConfigured()) {
    log("error", "[Gmail] GOOGLE_OAUTH_CLIENT_ID/SECRET o GMAIL_REFRESH_TOKEN no configurados");
    return false;
  }

  try {
    // Import diferido: el SDK de Google es pesado y buildRawMessage/isGmailConfigured no lo necesitan
    const { google } = await import("googleapis");
    const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    await gmail.users.messages.send({ userId: "me", requestBody: { raw: buildRawMessage(to, subject, html) } });
    return true;
  } catch (err) {
    log("error", `[Gmail] Error enviando email: ${stripControlChars(err instanceof Error ? err.message : String(err))}`);
    return false;
  }
}
