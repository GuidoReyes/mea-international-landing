/**
 * One-time script to obtain a Google OAuth2 refresh token for Drive backups.
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy npx ts-node src/scripts/get-drive-token.ts
 *
 * Opens a consent URL; after authorizing, the refresh token is printed.
 * Set it in Railway as GOOGLE_OAUTH_REFRESH_TOKEN.
 */
import * as fs from "fs";
import * as http from "http";
import { google } from "googleapis";
import { generateOAuthState, verifyOAuthState } from "../lib/oauth-state";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
const TOKEN_OUTPUT_FILE = "google-oauth-token.local.txt";

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

// vuln_046: sin `state`, cualquier página que el desarrollador tenga abierta podría
// redirigir su navegador a este callback con un `code` ajeno, y el script canjearía y
// mostraría el refresh token de esa OTRA cuenta como si fuera el propio.
const expectedState = generateOAuthState();

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force refresh_token issuance even if previously granted
  scope: ["https://www.googleapis.com/auth/drive.file"],
  state: expectedState,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!verifyOAuthState(url.searchParams.get("state"), expectedState)) {
    res.writeHead(403).end("Invalid or missing state — possible CSRF, request ignored.");
    return;
  }
  if (!code) {
    res.writeHead(400).end("Missing ?code param");
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" }).end("<h2>Listo — puedes cerrar esta pestaña.</h2>");

    const refreshToken = tokens.refresh_token ?? "";
    // vuln_045: nunca el token completo por consola (queda en el historial de la
    // terminal); se escribe en un archivo local 0600 y en pantalla solo se enmascara.
    fs.writeFileSync(TOKEN_OUTPUT_FILE, `GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken}\n`, { mode: 0o600 });
    const mascara = refreshToken.length > 6 ? `${refreshToken.slice(0, 6)}…(${refreshToken.length} chars)` : "(vacío)";
    console.log(`\n✅ Refresh token obtenido: ${mascara}`);
    console.log(`Valor completo escrito en: ${TOKEN_OUTPUT_FILE} (permisos 0600 — borralo tras copiarlo a Railway).`);
  } catch (err) {
    res.writeHead(500).end("Token exchange failed — see terminal.");
    console.error("Token exchange failed:", err instanceof Error ? err.message : err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("1. Abre esta URL en tu navegador y autoriza el acceso:\n");
  console.log(authUrl);
  console.log("\n2. Esperando autorización...");
});
