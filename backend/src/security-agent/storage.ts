import * as fs from "fs";
import * as path from "path";
import { log } from "../lib/logger";
import { decrypt, encrypt, isEncrypted } from "../lib/crypto-utils";
import type { ScanResult } from "./types";

const DEFAULT_HISTORY_DIR = path.join(__dirname, "../../.security-scans");
const MAX_SCANS = 20;
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;
const VULN_ID_PATTERN = /^vuln_\d{3,6}$/;

// SECURITY_SCANS_DIR lets tests use a temp dir instead of the real history.
const historyDir = (): string => process.env.SECURITY_SCANS_DIR ?? DEFAULT_HISTORY_DIR;
const historyFile = (): string => path.join(historyDir(), "history.json");

/**
 * The history is encrypted with a key derived from SECURITY_DASHBOARD_SECRET.
 * Rotating that secret makes the existing history unreadable: it is kept aside as
 * history.json.unreadable-<timestamp> (never overwritten) and a new history starts.
 */
function historySecret(): string {
  const secret = process.env.SECURITY_DASHBOARD_SECRET;
  if (!secret) throw new Error("SECURITY_DASHBOARD_SECRET not configured: cannot read or write the scan history");
  return secret;
}

export function isValidVulnId(id: string): boolean {
  return VULN_ID_PATTERN.test(id);
}

function ensureDir(): void {
  fs.mkdirSync(historyDir(), { recursive: true, mode: DIR_MODE });
  fs.chmodSync(historyDir(), DIR_MODE); // the mkdir mode only applies to a directory that did not exist
}

function keepUnreadable(file: string, reason: string): void {
  const target = `${file}.unreadable-${Date.now()}`;
  fs.renameSync(file, target);
  log("error", `[Storage] history.json unreadable (${reason}); kept as ${path.basename(target)}, starting a new history`);
}

function readHistory(): ScanResult[] {
  const file = historyFile();
  if (!fs.existsSync(file)) return [];

  const raw = fs.readFileSync(file, "utf-8");
  // A missing secret is a configuration error, not a corrupt file: throw before touching it
  const secret = isEncrypted(raw) ? historySecret() : null;

  try {
    return JSON.parse(secret ? decrypt(raw, secret) : raw) as ScanResult[];
  } catch (err) {
    keepUnreadable(file, err instanceof Error ? err.message : "unknown error");
    return [];
  }
}

function writeHistory(history: readonly ScanResult[]): void {
  const file = historyFile();
  const tmp = `${file}.tmp`;
  const payload = encrypt(JSON.stringify(history), historySecret());
  fs.writeFileSync(tmp, payload, { mode: FILE_MODE });
  fs.chmodSync(tmp, FILE_MODE);
  fs.renameSync(tmp, file); // atomic: a crash mid-write never leaves a truncated history
}

export function saveResult(result: ScanResult): void {
  ensureDir();
  const updated = [result, ...readHistory()].slice(0, MAX_SCANS);
  writeHistory(updated);
  log("info", `[Storage] Saved scan ${result.scan_id} (${updated.length} total)`);
}

export function getLatest(): ScanResult | null {
  ensureDir();
  return readHistory()[0] ?? null;
}

export function getHistory(): ScanResult[] {
  ensureDir();
  return readHistory();
}

export function markResolved(vulnId: string): boolean {
  if (!isValidVulnId(vulnId)) return false;

  ensureDir();
  const history = readHistory();
  const scanIndex = history.findIndex((scan) => scan.vulnerabilities.some((v) => v.id === vulnId));
  if (scanIndex === -1) return false;

  const resolvedAt = new Date().toISOString();
  const updated = history.map((scan, index) =>
    index !== scanIndex
      ? scan
      : {
          ...scan,
          vulnerabilities: scan.vulnerabilities.map((v) =>
            v.id === vulnId ? { ...v, resolved: true, resolved_at: resolvedAt } : v
          ),
        }
  );

  writeHistory(updated);
  log("info", `[Storage] Marked ${vulnId} as resolved`);
  return true;
}
