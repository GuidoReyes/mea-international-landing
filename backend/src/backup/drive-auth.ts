import { google } from "googleapis";
import * as path from "path";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Returns true when any Drive credential source is configured.
 */
export function isDriveConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  );
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

/**
 * Parses GOOGLE_SERVICE_ACCOUNT_JSON with a clear error. Messages never include the raw
 * value (it holds a private key), and the JSON.parse error is not chained because it can
 * quote a fragment of the input.
 */
export function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON debe ser un objeto JSON");
  }
  const { client_email: clientEmail, private_key: privateKey } = parsed as Record<string, unknown>;
  if (typeof clientEmail !== "string" || clientEmail === "") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no incluye client_email");
  }
  if (typeof privateKey !== "string" || privateKey === "") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no incluye private_key");
  }
  return parsed as ServiceAccountCredentials;
}

/**
 * Builds a Google Drive client from one of (in priority order):
 * - GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + GOOGLE_OAUTH_REFRESH_TOKEN
 *   (personal Gmail: service accounts have no storage quota, OAuth is required)
 * - GOOGLE_SERVICE_ACCOUNT_JSON  (Workspace shared drives: JSON string as env var)
 * - GOOGLE_SERVICE_ACCOUNT_PATH  (local: path to JSON key file)
 */
export function buildDriveClient() {
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const oauth2 = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
    oauth2.setCredentials({ refresh_token: oauthRefreshToken });
    return google.drive({ version: "v3", auth: oauth2 });
  }

  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  if (!jsonEnv && !filePath) {
    throw new Error(
      "Set GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN (personal Gmail), GOOGLE_SERVICE_ACCOUNT_JSON (Railway) or GOOGLE_SERVICE_ACCOUNT_PATH (local)"
    );
  }

  let auth: InstanceType<typeof google.auth.GoogleAuth>;

  if (jsonEnv) {
    const credentials = parseServiceAccountJson(jsonEnv);
    auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    auth = new google.auth.GoogleAuth({ keyFile: path.resolve(filePath!), scopes: SCOPES });
  }

  return google.drive({ version: "v3", auth });
}
