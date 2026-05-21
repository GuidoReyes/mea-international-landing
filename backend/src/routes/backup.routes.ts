import { Router } from "express";
import { runBackup, getLastBackupResult } from "../backup/scheduler";
import { listDriveBackups } from "../backup/uploader";
import { securityKeyMiddleware } from "../security-agent/middleware";
import { log } from "../lib/logger";

const router = Router();

router.post("/api/backup/trigger", securityKeyMiddleware, async (_req, res) => {
  log("info", "[BackupRoutes] Manual backup triggered");
  try {
    const result = await runBackup();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `[BackupRoutes] Trigger failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

router.get("/api/backup/status", securityKeyMiddleware, (_req, res) => {
  const last = getLastBackupResult();
  if (!last) {
    res.status(404).json({ error: "No backup history" });
    return;
  }
  res.json(last);
});

router.get("/api/backup/history", securityKeyMiddleware, async (_req, res) => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    res.status(500).json({ error: "Google Service Account not configured" });
    return;
  }
  try {
    const files = await listDriveBackups(50);
    res.json(files);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `[BackupRoutes] Drive history failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

export default router;
