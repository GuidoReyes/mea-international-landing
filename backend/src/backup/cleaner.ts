import * as fs from "fs";
import * as path from "path";
import { log } from "../lib/logger";
import { readPositiveInt } from "../lib/env-utils";
import { buildBackupListQuery, isBackupFileName } from "../lib/drive-utils";
import { buildDriveClient } from "./drive-auth";

const BACKUP_DIR = path.join(__dirname, "../../backups");
const DEFAULT_LOCAL_KEEP = 3;
const DEFAULT_DRIVE_KEEP = 30;

/**
 * Files beyond the `keep` most recent. An invalid `keep` (NaN, 0, negative) deletes nothing:
 * slice(NaN) behaves like slice(0), which would otherwise delete every backup.
 */
export function selectFilesToDelete<T extends { mtime: number }>(files: readonly T[], keep: number): T[] {
  if (!Number.isInteger(keep) || keep < 1) return [];
  return [...files].sort((a, b) => b.mtime - a.mtime).slice(keep);
}

function cleanLocalBackups(keep: number): void {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(isBackupFileName)
    .map((name) => ({ name, mtime: fs.statSync(path.join(BACKUP_DIR, name)).mtimeMs }));

  const toDelete = selectFilesToDelete(files, keep);
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    log("info", `[Cleaner] Deleted local backup: ${f.name}`);
  }
  if (toDelete.length > 0) {
    log("info", `[Cleaner] Removed ${toDelete.length} local backups (kept ${keep})`);
  }
}

async function cleanDriveBackups(keep: number): Promise<void> {
  const hasCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!hasCredentials) {
    log("warn", "[Cleaner] No Google credentials set — skipping Drive cleanup");
    return;
  }

  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    // Without a dedicated folder the backups sit in the Drive root next to other files
    // (payment receipts included): never delete blindly.
    log("warn", "[Cleaner] GOOGLE_DRIVE_BACKUP_FOLDER_ID not set — skipping Drive cleanup");
    return;
  }

  const drive = buildDriveClient();
  const res = await drive.files.list({
    q: buildBackupListQuery(folderId),
    orderBy: "createdTime desc",
    fields: "files(id,name,createdTime)",
  });

  const backups = (res.data.files ?? [])
    .filter((f) => isBackupFileName(f.name ?? ""))
    .map((f) => ({ id: f.id!, name: f.name!, mtime: Date.parse(f.createdTime ?? "") || 0 }));

  const toDelete = selectFilesToDelete(backups, keep);
  for (const file of toDelete) {
    await drive.files.delete({ fileId: file.id });
    log("info", `[Cleaner] Deleted Drive backup: ${file.name}`);
  }
  if (toDelete.length > 0) {
    log("info", `[Cleaner] Removed ${toDelete.length} Drive backups (kept ${keep})`);
  }
}

export async function cleanupOldBackups(): Promise<void> {
  cleanLocalBackups(readPositiveInt(process.env.BACKUP_LOCAL_KEEP_COUNT, DEFAULT_LOCAL_KEEP));
  await cleanDriveBackups(readPositiveInt(process.env.BACKUP_DRIVE_KEEP_COUNT, DEFAULT_DRIVE_KEEP));
}
