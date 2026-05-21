import * as cron from "node-cron";
import { dumpDatabase } from "./dumper";
import { uploadToDrive } from "./uploader";
import { cleanupOldBackups } from "./cleaner";
import { log } from "../lib/logger";
import type { BackupResult } from "./types";

let lastBackupResult: BackupResult | null = null;

export function getLastBackupResult(): BackupResult | null {
  return lastBackupResult;
}

export async function runBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  log("info", "[Scheduler] Starting backup run");

  try {
    const dump = await dumpDatabase();
    const upload = await uploadToDrive(dump.filePath, dump.fileName);
    await cleanupOldBackups();

    const result: BackupResult = {
      status: "COMPLETED",
      timestamp: new Date().toISOString(),
      fileName: dump.fileName,
      filePath: dump.filePath,
      sizeBytes: dump.sizeBytes,
      durationMs: Date.now() - startTime,
      driveFileId: upload.driveFileId,
      driveFileName: upload.driveFileName,
      webViewLink: upload.webViewLink,
    };

    lastBackupResult = result;
    log("info", `[Scheduler] Backup completed in ${result.durationMs}ms → ${upload.driveFileName}`);
    return result;
  } catch (err) {
    const result: BackupResult = {
      status: "FAILED",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };

    lastBackupResult = result;
    log("error", `[Scheduler] Backup failed: ${result.error}`);
    return result;
  }
}

export function startBackupScheduler(): void {
  const schedule = process.env.BACKUP_CRON_SCHEDULE ?? "0 2 * * *";

  if (!cron.validate(schedule)) {
    log("error", `[Scheduler] Invalid BACKUP_CRON_SCHEDULE: "${schedule}" — scheduler not started`);
    return;
  }

  cron.schedule(schedule, () => {
    log("info", "[Scheduler] Cron triggered — starting scheduled backup");
    runBackup().catch((err) =>
      log("error", `[Scheduler] Unhandled backup error: ${err instanceof Error ? err.message : String(err)}`)
    );
  });

  log("info", `[Scheduler] Backup scheduler started — schedule: "${schedule}"`);
}
