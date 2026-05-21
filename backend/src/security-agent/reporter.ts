import { randomUUID } from "crypto";
import { log } from "../lib/logger";
import type { ScanResult } from "./types";

export function buildScanResult(
  vulnerabilities: import("./types").Vulnerability[],
  avgScore: number,
  summaries: string[],
  filesScanned: number,
  durationMs: number
): ScanResult {
  const result: ScanResult = {
    scan_id: randomUUID(),
    timestamp: new Date().toISOString(),
    project_name: process.env.PROJECT_NAME ?? "MEA International",
    files_scanned: filesScanned,
    security_score: avgScore,
    vulnerabilities,
    scan_summary: summaries.join(" ") || "Scan completed with no issues found.",
    status: "COMPLETED",
    duration_ms: durationMs,
  };

  log(
    "info",
    `[Reporter] ScanResult built: id=${result.scan_id}, score=${avgScore}, vulns=${vulnerabilities.length}, files=${filesScanned}`
  );
  return result;
}
