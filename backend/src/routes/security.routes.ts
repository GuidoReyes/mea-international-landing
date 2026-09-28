import { Router } from "express";
import { randomUUID } from "crypto";
import * as path from "path";
import { scanCodebase } from "../security-agent/scanner";
import { analyzeChunks } from "../security-agent/analyzer";
import { buildScanResult } from "../security-agent/reporter";
import { saveResult, getLatest, getHistory, markResolved, isValidVulnId } from "../security-agent/storage";
import { sendSecurityEmail } from "../security-agent/emailer";
import type { Request, Response } from "express";
import { authorize, securityKeyMiddleware } from "../security-agent/middleware";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "../security-agent/session";
import { safeEqual } from "../lib/safe-equal";
import { scanLimiter } from "../middleware/rate-limit.middleware";
import { log } from "../lib/logger";

const router = Router();

// In-memory scan state (process-scoped, sufficient for single-instance Railway deploy)
interface ScanState {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  error?: string;
}

// vuln_039: este Map nunca perdía entradas — cada scan (protegido por
// securityKeyMiddleware + scanLimiter, 2/hora) las acumulaba para siempre. Con
// el ritmo real de uso tardaría años en pesar algo, pero un proceso de larga
// vida no debería crecer sin límite. TTL + tope de tamaño, sin agregar una
// dependencia nueva para un Map de unas pocas entradas.
export const MAX_SCAN_STATES = 200;
export const SCAN_STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — más que suficiente para consultar un scan ya terminado

interface ScanStateEntry extends ScanState {
  updatedAt: number;
}
export const scanStates = new Map<string, ScanStateEntry>();

export function pruneScanStates(nowMs: number = Date.now()): void {
  for (const [id, entry] of scanStates) {
    if (nowMs - entry.updatedAt > SCAN_STATE_TTL_MS) scanStates.delete(id);
  }
  // Map conserva el orden de inserción: la primera clave es la más vieja (LRU simple).
  while (scanStates.size > MAX_SCAN_STATES) {
    const oldest = scanStates.keys().next().value;
    if (oldest === undefined) break;
    scanStates.delete(oldest);
  }
}

export function setScanState(scanId: string, state: ScanState, nowMs: number = Date.now()): void {
  scanStates.set(scanId, { ...state, updatedAt: nowMs });
  pruneScanStates(nowMs);
}

// ── Dashboard assets ──────────────────────────────────────────────────────────
// D1 (tarea 477): la clave nunca se acepta en la URL (vuln_053) y los assets ya no son
// públicos (vuln_028). Los navegadores no pueden mandar X-Security-Key al cargar un
// <script>, así que el acceso es por cookie de sesión, emitida por /api/security/login.

const DASHBOARD_DIR = path.join(__dirname, "../security-agent/dashboard");

export function dashboardPage(req: Request, res: Response): void {
  if (authorize(req) !== "ok") {
    res.redirect("/security/login");
    return;
  }
  res.sendFile(path.join(DASHBOARD_DIR, "index.html"));
}

export function loginHandler(req: Request, res: Response): void {
  const secret = process.env.SECURITY_DASHBOARD_SECRET;
  if (!secret) {
    res.status(500).json({ error: "SECURITY_DASHBOARD_SECRET not configured" });
    return;
  }

  // Solo el header cuenta como intento de login: la query nunca es una fuente válida de clave
  const provided = req.headers["x-security-key"];
  if (typeof provided !== "string" || !safeEqual(provided, secret)) {
    res.status(403).json({ error: "Invalid security key" });
    return;
  }

  res.cookie(SESSION_COOKIE, createSessionToken(secret), sessionCookieOptions());
  res.json({ ok: true });
}

router.get("/security", dashboardPage);
router.get("/security/login", (_req, res) => res.sendFile(path.join(DASHBOARD_DIR, "login.html")));
router.get("/security/login.js", (_req, res) => res.sendFile(path.join(DASHBOARD_DIR, "login.js")));
router.post("/api/security/login", loginHandler); // securityAuthLimiter ya está montado en index.ts sobre /api/security

router.get("/security/assets/styles.css", securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "styles.css"));
});

router.get("/security/assets/app.js", securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "app.js"));
});

// ── Scan endpoints ─────────────────────────────────────────────────────────────

router.post("/api/security/scan", securityKeyMiddleware, scanLimiter, async (_req, res) => {
  const scanId = randomUUID();
  setScanState(scanId, { status: "PENDING" });
  res.json({ scan_id: scanId, status: "PENDING" });

  // Fire-and-forget async scan
  (async () => {
    const startTime = Date.now();
    try {
      setScanState(scanId, { status: "RUNNING", progress: 0 });

      const { chunks, allFiles } = scanCodebase();

      const { vulnerabilities, avgScore, summaries } = await analyzeChunks(
        chunks,
        (completed, total) => {
          setScanState(scanId, {
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
      setScanState(scanId, { status: "COMPLETED", progress: 100 });
      log("info", `[SecurityRoutes] Scan ${scanId} completed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `[SecurityRoutes] Scan ${scanId} failed: ${msg}`);
      setScanState(scanId, { status: "FAILED", error: msg });
    }
  })();
});

router.get("/api/security/status/:scan_id", securityKeyMiddleware, (req, res) => {
  const entry = scanStates.get(req.params["scan_id"] as string);
  if (!entry) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }
  // updatedAt es un detalle interno del TTL/LRU (vuln_039) — no forma parte del
  // contrato público de este endpoint.
  const { updatedAt: _updatedAt, ...state } = entry;
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
  const id = req.params["id"] as string;
  if (!isValidVulnId(id)) {
    res.status(400).json({ error: "Invalid vulnerability id" });
    return;
  }
  const success = markResolved(id);
  if (!success) {
    res.status(404).json({ error: "Vulnerability not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
