import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Builds a Google Drive client from either:
 * - GOOGLE_SERVICE_ACCOUNT_JSON  (Railway: JSON string as env var)
 * - GOOGLE_SERVICE_ACCOUNT_PATH  (local: path to JSON file)
 */
export function buildDriveClient() {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  if (!jsonEnv && !filePath) {
    throw new Error("Set GOOGLE_SERVICE_ACCOUNT_JSON (Railway) or GOOGLE_SERVICE_ACCOUNT_PATH (local)");
  }

  let auth: InstanceType<typeof google.auth.GoogleAuth>;

  if (jsonEnv) {
    const credentials = JSON.parse(jsonEnv);
    auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    auth = new google.auth.GoogleAuth({ keyFile: path.resolve(filePath!), scopes: SCOPES });
  }

  return google.drive({ version: "v3", auth });
}
