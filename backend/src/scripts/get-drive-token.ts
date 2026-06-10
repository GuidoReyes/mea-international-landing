/**
 * One-time script to obtain a Google OAuth2 refresh token for Drive backups.
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy npx ts-node src/scripts/get-drive-token.ts
 *
 * Opens a consent URL; after authorizing, the refresh token is printed.
 * Set it in Railway as GOOGLE_OAUTH_REFRESH_TOKEN.
 */
import * as http from "http";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force refresh_token issuance even if previously granted
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Missing ?code param");
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" }).end("<h2>Listo — puedes cerrar esta pestaña.</h2>");
    console.log("\n✅ Refresh token obtenido:\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nGuárdalo en Railway junto con GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET.");
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
