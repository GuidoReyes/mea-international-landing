/**
 * Pruebas del envío por Gmail del reporte de seguridad (tarea #83: Railway no tiene
 * MS Graph configurado, el reporte sale por la API de Gmail).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-gmail-sender.ts
 */
import assert from "node:assert/strict";
import { buildRawMessage, isGmailConfigured } from "../security-agent/gmail-sender";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

const decode = (raw: string): string => Buffer.from(raw, "base64url").toString("utf8");

function headersOf(mime: string): string[] {
  return mime.split("\r\n\r\n")[0].split("\r\n");
}

// ── buildRawMessage() ────────────────────────────────────────────────────────

check("produce base64url (sin +, / ni =) apto para users.messages.send", () => {
  const raw = buildRawMessage("dueno@example.com", "Asunto", "<p>hola</p>");
  assert.match(raw, /^[A-Za-z0-9_-]+$/);
});

check("incluye To, Subject codificado, MIME y Content-Type HTML UTF-8", () => {
  const mime = decode(buildRawMessage("dueno@example.com", "[Security Scan] Score: 73", "<p>hola</p>"));
  const headers = headersOf(mime);
  assert.ok(headers.includes("To: dueno@example.com"));
  assert.ok(headers.includes("MIME-Version: 1.0"));
  assert.ok(headers.includes('Content-Type: text/html; charset="UTF-8"'));
  const subject = headers.find((h) => h.startsWith("Subject: "));
  assert.ok(subject, "falta Subject");
  const encoded = subject.slice("Subject: ".length).match(/^=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=$/);
  assert.ok(encoded, `Subject no está en RFC 2047: ${subject}`);
  assert.equal(Buffer.from(encoded[1], "base64").toString("utf8"), "[Security Scan] Score: 73");
});

check("el cuerpo HTML llega intacto (base64 por línea, sin romper acentos)", () => {
  const html = "<p>Configuración · ñandú ✓</p>";
  const mime = decode(buildRawMessage("dueno@example.com", "x", html));
  assert.ok(headersOf(mime).includes("Content-Transfer-Encoding: base64"));
  const body = mime.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n/g, "");
  assert.equal(Buffer.from(body, "base64").toString("utf8"), html);
});

check("un CRLF en el asunto no inyecta cabeceras (Bcc)", () => {
  const mime = decode(buildRawMessage("dueno@example.com", "Score\r\nBcc: atacante@example.com", "<p>x</p>"));
  assert.equal(headersOf(mime).some((h) => /^bcc:/i.test(h)), false);
});

check("rechaza un destinatario con CRLF (inyección de cabeceras)", () => {
  assert.throws(() => buildRawMessage("dueno@example.com\r\nBcc: atacante@example.com", "x", "y"));
});

check("rechaza un destinatario que no es un email", () => {
  assert.throws(() => buildRawMessage("no-es-un-email", "x", "y"));
});

// ── isGmailConfigured() ──────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

check("isGmailConfigured: true con client id, secret y GMAIL_REFRESH_TOKEN", () => {
  withEnv({ GOOGLE_OAUTH_CLIENT_ID: "id", GOOGLE_OAUTH_CLIENT_SECRET: "s", GMAIL_REFRESH_TOKEN: "t" }, () => {
    assert.equal(isGmailConfigured(), true);
  });
});

check("isGmailConfigured: false sin GMAIL_REFRESH_TOKEN (el token de Drive no tiene gmail.send)", () => {
  withEnv(
    { GOOGLE_OAUTH_CLIENT_ID: "id", GOOGLE_OAUTH_CLIENT_SECRET: "s", GMAIL_REFRESH_TOKEN: undefined, GOOGLE_OAUTH_REFRESH_TOKEN: "drive" },
    () => assert.equal(isGmailConfigured(), false)
  );
});

check("isGmailConfigured: false sin client secret", () => {
  withEnv({ GOOGLE_OAUTH_CLIENT_ID: "id", GOOGLE_OAUTH_CLIENT_SECRET: undefined, GMAIL_REFRESH_TOKEN: "t" }, () => {
    assert.equal(isGmailConfigured(), false);
  });
});

console.log(failures === 0 ? "\nOK — todas las pruebas pasaron" : `\n${failures} prueba(s) fallaron`);
process.exit(failures === 0 ? 0 : 1);
