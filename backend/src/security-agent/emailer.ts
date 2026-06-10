import { log } from "../lib/logger";
import { sendTransactionalEmail } from "../services/notifications";
import type { ScanResult } from "./types";

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

function buildHtml(result: ScanResult): string {
  const criticalHigh = result.vulnerabilities.filter(
    (v) => v.severity === "CRITICAL" || v.severity === "HIGH"
  );
  const color = scoreColor(result.security_score);
  // No key in the URL: the dashboard gate prompts for it (a secret embedded
  // in an email link leaks via forwards, previews and mail-server logs)
  const dashboardUrl = `${process.env.API_PUBLIC_URL ?? "https://api.mea.edu.gt"}/security`;

  const vulnRows = criticalHigh.length === 0
    ? `<tr><td colspan="3" style="color:#22c55e;padding:12px">✓ No critical or high severity issues found</td></tr>`
    : criticalHigh.map((v) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:${v.severity === "CRITICAL" ? "#ef4444" : "#f97316"}">${v.severity}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb">${v.title}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${v.file}:${v.line}</td>
        </tr>`).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:20px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:30px;text-align:center">
      <div style="font-size:14px;opacity:0.7;margin-bottom:8px">🛡️ Security Scan Report</div>
      <div style="font-size:12px;opacity:0.5">${new Date(result.timestamp).toLocaleString()}</div>
      <div style="font-size:56px;font-weight:bold;color:${color};margin:16px 0">${result.security_score}</div>
      <div style="font-size:14px;opacity:0.7">Security Score</div>
    </div>
    <div style="padding:24px">
      <h3 style="color:#334155;margin-top:0">Executive Summary</h3>
      <p style="color:#64748b;line-height:1.6">${result.scan_summary}</p>
      <p style="color:#94a3b8;font-size:13px">${result.files_scanned} files scanned in ${Math.round(result.duration_ms / 1000)}s · ${result.vulnerabilities.length} total vulnerabilities</p>

      <h3 style="color:#334155">Critical &amp; High Severity</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr>
          <th style="padding:10px;text-align:left;background:#f8fafc;color:#64748b">Severity</th>
          <th style="padding:10px;text-align:left;background:#f8fafc;color:#64748b">Title</th>
          <th style="padding:10px;text-align:left;background:#f8fafc;color:#64748b">Location</th>
        </tr></thead>
        <tbody>${vulnRows}</tbody>
      </table>

      <div style="margin-top:24px;text-align:center">
        <a href="${dashboardUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          View Full Report →
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
      Automated Security Scan · MEA International · Scan ID: ${result.scan_id.slice(0, 8)}
    </div>
  </div>
</body>
</html>`;
}

export async function sendSecurityEmail(
  result: ScanResult
): Promise<{ success: boolean; error?: string }> {
  // Sent via MS Graph (HTTP) — Railway blocks outbound SMTP ports
  const emailTo = process.env.SECURITY_EMAIL_TO;

  if (!emailTo) {
    log("warn", "[Emailer] SECURITY_EMAIL_TO not configured — skipping email notification");
    return { success: false, error: "SECURITY_EMAIL_TO not configured" };
  }

  const subject = `[Security Scan] Score: ${result.security_score} · ${result.vulnerabilities.filter((v) => v.severity === "CRITICAL").length} critical`;
  const ok = await sendTransactionalEmail(emailTo, subject, buildHtml(result));

  if (ok) {
    log("info", `[Emailer] Report sent to ${emailTo}`);
    return { success: true };
  }
  return { success: false, error: "MS Graph send failed — see logs" };
}
