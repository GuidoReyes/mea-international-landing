import { Router } from "express";
import { randomUUID } from "crypto";
import * as path from "path";
import { scanCodebase } from "../security-agent/scanner";
import { analyzeChunks } from "../security-agent/analyzer";
import { buildScanResult } from "../security-agent/reporter";
import { saveResult, getLatest, getHistory, markResolved } from "../security-agent/storage";
import { sendSecurityEmail } from "../security-agent/emailer";
import { securityKeyMiddleware } from "../security-agent/middleware";
import { log } from "../lib/logger";

const router = Router();

// In-memory scan state (process-scoped, sufficient for single-instance Railway deploy)
interface ScanState {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  error?: string;
}
const scanStates = new Map<string, ScanState>();

// ── Dashboard assets ──────────────────────────────────────────────────────────

const DASHBOARD_DIR = path.join(__dirname, "../security-agent/dashboard");

router.get("/security", securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "index.html"));
});

router.get("/security/assets/styles.css", (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "styles.css"));
});

router.get("/security/assets/app.js", (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "app.js"));
});

// ── Scan endpoints ─────────────────────────────────────────────────────────────

router.post("/api/security/scan", securityKeyMiddleware, async (_req, res) => {
  const scanId = randomUUID();
  scanStates.set(scanId, { status: "PENDING" });
  res.json({ scan_id: scanId, status: "PENDING" });

  // Fire-and-forget async scan
  (async () => {
    const startTime = Date.now();
    try {
      scanStates.set(scanId, { status: "RUNNING", progress: 0 });

      const { chunks, allFiles } = scanCodebase();

      const { vulnerabilities, avgScore, summaries } = await analyzeChunks(
        chunks,
        (completed, total) => {
          scanStates.set(scanId, {
            status: "RUNNING",
            progress: Math.round((completed / total) * 100),
          });
        }
      );

      const result = buildScanResult(
        vulnerabilities,
        avgScore,
        summaries,
        allFiles.length,
        Date.now() - startTime
      );
      // Override the generated UUID with the one returned to the client
      result.scan_id = scanId;

      saveResult(result);
      scanStates.set(scanId, { status: "COMPLETED", progress: 100 });
      log("info", `[SecurityRoutes] Scan ${scanId} completed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `[SecurityRoutes] Scan ${scanId} failed: ${msg}`);
      scanStates.set(scanId, { status: "FAILED", error: msg });
    }
  })();
});

router.get("/api/security/status/:scan_id", securityKeyMiddleware, (req, res) => {
  const state = scanStates.get(req.params["scan_id"] as string);
  if (!state) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }
  res.json(state);
});

// ── Results endpoints ──────────────────────────────────────────────────────────

router.get("/api/security/results", securityKeyMiddleware, (_req, res) => {
  const latest = getLatest();
  if (!latest) {
    res.status(404).json({ error: "No scans found" });
    return;
  }
  res.json(latest);
});

router.get("/api/security/history", securityKeyMiddleware, (_req, res) => {
  res.json(getHistory());
});

router.post("/api/security/email", securityKeyMiddleware, async (_req, res) => {
  const latest = getLatest();
  if (!latest) {
    res.status(404).json({ error: "No scan results to email" });
    return;
  }
  const result = await sendSecurityEmail(latest);
  res.json(result);
});

router.patch("/api/security/vuln/:id/resolve", securityKeyMiddleware, (req, res) => {
  const success = markResolved(req.params["id"] as string);
  if (!success) {
    res.status(404).json({ error: "Vulnerability not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
