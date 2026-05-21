import * as fs from "fs";
import * as path from "path";
import { log } from "../lib/logger";
import type { ScanResult, Vulnerability } from "./types";

const HISTORY_DIR = path.join(__dirname, "../../.security-scans");
const HISTORY_FILE = path.join(HISTORY_DIR, "history.json");
const MAX_SCANS = 20;

function ensureDir() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

function readHistory(): ScanResult[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")) as ScanResult[];
  } catch {
    log("warn", "[Storage] Corrupted history.json, starting fresh");
    return [];
  }
}

function writeHistory(history: ScanResult[]) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function saveResult(result: ScanResult): void {
  ensureDir();
  const history = readHistory();
  history.unshift(result);
  writeHistory(history.slice(0, MAX_SCANS));
  log("info", `[Storage] Saved scan ${result.scan_id} (${history.length + 1} total)`);
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
  ensureDir();
  const history = readHistory();
  let found = false;

  for (const scan of history) {
    const vuln = scan.vulnerabilities.find((v: Vulnerability) => v.id === vulnId);
    if (vuln) {
      vuln.resolved = true;
      vuln.resolved_at = new Date().toISOString();
      found = true;
      break;
    }
  }

  if (found) {
    writeHistory(history);
    log("info", `[Storage] Marked ${vulnId} as resolved`);
  }
  return found;
}
