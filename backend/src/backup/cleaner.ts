import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import { log } from "../lib/logger";

const BACKUP_DIR = path.join(__dirname, "../../backups");

export async function cleanupOldBackups(): Promise<void> {
  const localKeep = parseInt(process.env.BACKUP_LOCAL_KEEP_COUNT ?? "3");
  const driveKeep = parseInt(process.env.BACKUP_DRIVE_KEEP_COUNT ?? "30");

  // Local cleanup
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql.gz"))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(localKeep);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      log("info", `[Cleaner] Deleted local backup: ${f.name}`);
    }
    if (toDelete.length > 0) {
      log("info", `[Cleaner] Removed ${toDelete.length} local backups (kept ${localKeep})`);
    }
  }

  // Google Drive cleanup
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    log("warn", "[Cleaner] GOOGLE_SERVICE_ACCOUNT_PATH not set — skipping Drive cleanup");
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(serviceAccountPath),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  const res = await drive.files.list({
    q: folderId ? `'${folderId}' in parents and trashed=false` : "trashed=false",
    orderBy: "createdTime desc",
    fields: "files(id,name,createdTime)",
  });

  const files = res.data.files ?? [];
  const toDeleteDrive = files.slice(driveKeep);

  for (const file of toDeleteDrive) {
    await drive.files.delete({ fileId: file.id! });
    log("info", `[Cleaner] Deleted Drive backup: ${file.name}`);
  }

  if (toDeleteDrive.length > 0) {
    log("info", `[Cleaner] Removed ${toDeleteDrive.length} Drive backups (kept ${driveKeep})`);
  }
}
