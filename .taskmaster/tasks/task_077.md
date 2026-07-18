# Task ID: 77

**Title:** Implement Storage, Reporter, Emailer, and Cleaner Modules

**Status:** done

**Dependencies:** 72 ✓, 73 ✓, 75 ✓, 76 ✓

**Priority:** medium

**Description:** Build src/security-agent/storage.ts for scan history, reporter.ts for merging results, emailer.ts for HTML emails, and src/backup/cleaner.ts for file rotation

**Details:**

Create storage.ts:

import * as fs from 'fs';
import * as path from 'path';
import { ScanResult } from './types';

const HISTORY_DIR = path.join(__dirname, '../../.security-scans');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');
const MAX_SCANS = 20;

function ensureDir() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

export function saveResult(result: ScanResult): void {
  ensureDir();
  let history: ScanResult[] = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Corrupted history.json, starting fresh');
  }
  history.unshift(result);
  if (history.length > MAX_SCANS) history = history.slice(0, MAX_SCANS);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function getLatest(): ScanResult | null {
  ensureDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      return history[0] || null;
    }
  } catch (err) {
    console.error('Failed to read history:', err);
  }
  return null;
}

export function getHistory(): ScanResult[] {
  ensureDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read history:', err);
  }
  return [];
}

export function markResolved(vulnId: string): boolean {
  ensureDir();
  const history = getHistory();
  let found = false;
  for (const scan of history) {
    const vuln = scan.vulnerabilities.find(v => v.id === vulnId);
    if (vuln) {
      vuln.resolved = true;
      vuln.resolved_at = new Date().toISOString();
      found = true;
      break;
    }
  }
  if (found) fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  return found;
}

Create reporter.ts:

import { ScanResult, Vulnerability } from './types';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid @types/uuid

export function mergeChunkResults(chunkResults: Array<{ vulnerabilities: Vulnerability[]; security_score: number; scan_summary: string }>, filesScanned: number, durationMs: number): ScanResult {
  const allVulns = chunkResults.flatMap(r => r.vulnerabilities);
  const avgScore = Math.round(chunkResults.reduce((sum, r) => sum + r.security_score, 0) / chunkResults.length);
  const summaries = chunkResults.map(r => r.scan_summary).filter(s => s !== 'Analysis failed');
  
  return {
    scan_id: uuidv4(),
    timestamp: new Date().toISOString(),
    project_name: process.env.PROJECT_NAME || 'Unknown',
    files_scanned: filesScanned,
    security_score: avgScore,
    vulnerabilities: allVulns.map((v, i) => ({ ...v, id: v.id || `vuln-${i}` })),
    scan_summary: summaries.join(' ') || 'Scan completed.',
    status: 'COMPLETED',
    duration_ms: durationMs
  };
}

Create emailer.ts:

import * as nodemailer from 'nodemailer';
import { ScanResult } from './types';

export async function sendSecurityEmail(result: ScanResult): Promise<{ success: boolean; error?: string }> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  const criticalHigh = result.vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
  const scoreColor = result.security_score >= 80 ? '#22c55e' : result.security_score >= 50 ? '#eab308' : '#ef4444';
  
  const html = `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;background:#f3f4f6;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:30px;text-align:center}.score{font-size:48px;font-weight:bold;color:${scoreColor}}.table{width:100%;border-collapse:collapse}.table td,.table th{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}.footer{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🛡️ Security Scan Report</h1>
    <p>${new Date(result.timestamp).toLocaleString()}</p>
  </div>
  <div style="padding:30px">
    <div style="text-align:center;margin-bottom:30px">
      <div class="score">${result.security_score}</div>
      <p style="color:#6b7280">Security Score</p>
    </div>
    <h2>Executive Summary</h2>
    <p>${result.scan_summary}</p>
    <h2>Critical & High Severity Vulnerabilities</h2>
    ${criticalHigh.length === 0 ? '<p style="color:#22c55e">✓ No critical or high severity issues found</p>' : `
    <table class="table">
      <thead><tr><th>Severity</th><th>Title</th><th>File</th></tr></thead>
      <tbody>
        ${criticalHigh.map(v => `<tr><td style="color:${v.severity === 'CRITICAL' ? '#ef4444' : '#f97316'}">${v.severity}</td><td>${v.title}</td><td>${v.file}</td></tr>`).join('')}
      </tbody>
    </table>
    `}
    <div style="text-align:center;margin-top:30px">
      <a href="${process.env.FRONTEND_URL}/security?key=${process.env.SECURITY_DASHBOARD_SECRET}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">View Full Report</a>
    </div>
  </div>
  <div class="footer">
    <p>Automated Security Scan | ${result.files_scanned} files scanned in ${Math.round(result.duration_ms / 1000)}s</p>
  </div>
</div>
</body>
</html>
  `;
  
  try {
    await transport.sendMail({
      from: process.env.SECURITY_EMAIL_FROM,
      to: process.env.SECURITY_EMAIL_TO,
      subject: `Security Scan Report - Score: ${result.security_score}`,
      html
    });
    return { success: true };
  } catch (err) {
    console.error('Email failed:', err);
    return { success: false, error: String(err) };
  }
}

Create cleaner.ts:

import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';

export async function cleanupOldBackups(): Promise<void> {
  const backupDir = path.join(__dirname, '../../backups');
  const localKeep = parseInt(process.env.BACKUP_LOCAL_KEEP_COUNT || '3');
  const driveKeep = parseInt(process.env.BACKUP_DRIVE_KEEP_COUNT || '30');
  
  // Clean local backups
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sql.gz'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
    
    files.slice(localKeep).forEach(f => {
      fs.unlinkSync(path.join(backupDir, f.name));
      console.log(`Deleted old local backup: ${f.name}`);
    });
  }
  
  // Clean Drive backups
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) return;
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(serviceAccountPath),
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  
  const res = await drive.files.list({
    q: folderId ? `'${folderId}' in parents and trashed=false` : 'trashed=false',
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime)'
  });
  
  const filesToDelete = (res.data.files || []).slice(driveKeep);
  for (const file of filesToDelete) {
    await drive.files.delete({ fileId: file.id! });
    console.log(`Deleted old Drive backup: ${file.name}`);
  }
}

All modules use path.join(__dirname, ...) for Railway compatibility. Install uuid if not present.

**Test Strategy:**

storage.ts: Test saveResult creates directory and limits to 20 scans, verify markResolved updates correct vulnerability and adds timestamp. reporter.ts: Mock chunk results and verify average score calculation, UUID generation for scan_id. emailer.ts: Mock nodemailer transport, verify HTML template includes score with correct color, critical/high vulns table. cleaner.ts: Mock fs and googleapis, verify local files sorted by mtime and oldest deleted beyond limit, Drive files sorted by createdTime and deleted correctly
