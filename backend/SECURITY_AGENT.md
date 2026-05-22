# Security Agent & Backup System

Internal tooling for MEA International — automated security scanning powered by Claude AI and nightly MySQL backups to Google Drive.

---

## Architecture

```
Security Agent
  scanner.ts      →  reads source files, chunks them (≤80 KB each)
  analyzer.ts     →  sends chunks to Claude API, parses vulnerabilities
  reporter.ts     →  deduplicates findings, builds ScanResult
  storage.ts      →  persists history as JSON (max 20 scans)
  emailer.ts      →  sends HTML report via SMTP
  middleware.ts   →  timing-safe key check on all /api/security/* routes
  dashboard/      →  standalone HTML/CSS/JS dashboard (no build step)

Backup System
  dumper.ts       →  spawns mysqldump | gzip → .sql.gz file
  uploader.ts     →  uploads to Google Drive (multipart or resumable)
  cleaner.ts      →  rotates local + Drive backups (keeps N most recent)
  scheduler.ts    →  node-cron job, default 02:00 AM daily
```

---

## Prerequisites

- Node.js ≥ 18
- MySQL 8 (or Railway MySQL plugin)
- `mysqldump` available in PATH (pre-installed on Railway)
- Google Cloud project with Drive API enabled (for backups)
- SMTP credentials — Gmail App Password or ProtonMail Bridge

---

## Environment Variables

Add these to your `.env` (local) or Railway Variables (production).

### Security Agent

```env
# Required — protects /security dashboard and all /api/security/* endpoints
SECURITY_DASHBOARD_SECRET=<generate with: openssl rand -hex 32>

# Required — Claude API key for code analysis
ANTHROPIC_API_KEY=sk-ant-...
```

### Backup — Database

```env
# Already set by Railway MySQL plugin — no action needed on Railway
DATABASE_URL=mysql://user:password@host:3306/database
```

### Backup — Google Drive

```env
# Option A (Railway / production): paste the entire service account JSON as a single env var
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n..."}

# Option B (local dev): path to the downloaded JSON key file
GOOGLE_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json

# ID of the Drive folder to upload backups into
# Get it from the URL: drive.google.com/drive/folders/<FOLDER_ID>
GOOGLE_DRIVE_BACKUP_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWx

# How many local .sql.gz files to keep (default: 3)
BACKUP_LOCAL_KEEP_COUNT=3

# How many Drive backups to keep (default: 30)
BACKUP_DRIVE_KEEP_COUNT=30

# Cron expression for scheduled backup (default: 02:00 AM daily)
BACKUP_CRON=0 2 * * *
```

### Backup — Email Reports

```env
# SMTP — Gmail (App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # 16-char App Password (no spaces required)
SMTP_FROM=tu@gmail.com
SECURITY_REPORT_EMAIL=recipient@domain.com

# SMTP — ProtonMail Bridge
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=tu@proton.me
SMTP_PASS=<bridge-password>
SMTP_FROM=tu@proton.me
SECURITY_REPORT_EMAIL=recipient@domain.com
```

---

## Google Drive Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → select your project.
2. **APIs & Services → Enable APIs** → enable **Google Drive API**.
3. **IAM & Admin → Service Accounts → Create Service Account**.
   - Name: `mea-backup` (or any name)
   - No role needed at project level
4. Click the new service account → **Keys → Add Key → JSON** → download the file.
5. In Google Drive, create (or choose) a folder for backups.
6. **Share that folder** with the service account email (looks like `name@project.iam.gserviceaccount.com`) — give it **Editor** access.
7. Copy the folder ID from the Drive URL and set `GOOGLE_DRIVE_BACKUP_FOLDER_ID`.

### Railway — storing the JSON credential

Railway doesn't support file uploads. Paste the entire JSON content as one line into the `GOOGLE_SERVICE_ACCOUNT_JSON` variable:

```bash
# Minify the JSON to a single line before pasting:
cat service-account.json | jq -c .
```

Paste the output directly into Railway → Variables → `GOOGLE_SERVICE_ACCOUNT_JSON`.

---

## Gmail App Password Setup

1. Enable 2FA on your Google account.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. App: **Mail** / Device: **Other** → type `MEA Railway`.
4. Copy the 16-char password → set as `SMTP_PASS` (spaces optional).

---

## Usage

### Dashboard

```
https://api.mea.edu.gt/security?key=YOUR_SECRET
```

Or navigate to `https://api.mea.edu.gt/security` and enter the key in the gate overlay.

### API Endpoints

All endpoints require either:
- Header: `X-Security-Key: YOUR_SECRET`
- Query param: `?key=YOUR_SECRET`

```bash
# Trigger a full scan (async — returns scan_id immediately)
curl -X POST https://api.mea.edu.gt/api/security/scan \
  -H "X-Security-Key: YOUR_SECRET"

# Poll scan progress
curl https://api.mea.edu.gt/api/security/status/<scan_id> \
  -H "X-Security-Key: YOUR_SECRET"

# Get latest scan results
curl https://api.mea.edu.gt/api/security/results \
  -H "X-Security-Key: YOUR_SECRET"

# Get scan history (last 20)
curl https://api.mea.edu.gt/api/security/history \
  -H "X-Security-Key: YOUR_SECRET"

# Email the latest report
curl -X POST https://api.mea.edu.gt/api/security/email \
  -H "X-Security-Key: YOUR_SECRET"

# Mark a vulnerability as resolved
curl -X PATCH https://api.mea.edu.gt/api/security/vuln/vuln_001/resolve \
  -H "X-Security-Key: YOUR_SECRET"

# Trigger a manual backup
curl -X POST https://api.mea.edu.gt/api/backup/trigger \
  -H "X-Security-Key: YOUR_SECRET"

# Check last backup status
curl https://api.mea.edu.gt/api/backup/status \
  -H "X-Security-Key: YOUR_SECRET"
```

---

## Railway Deployment Notes

- **Ephemeral filesystem**: Railway containers restart and lose local files. Backups are uploaded to Drive immediately and local `.sql.gz` files are deleted after upload. Scan history is stored in `.security-scans/history.json` — this is also ephemeral; history resets on redeploy. For persistent history, migrate `storage.ts` to use the database.
- **mysqldump**: pre-installed on Railway's Node environment. If a future base image removes it, install via `apt-get install -y mysql-client` in a Railway Dockerfile.
- **Build step**: `npm run build` copies `src/security-agent/dashboard/` to `dist/security-agent/dashboard/`. If you skip the build, the dashboard 404s.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Dashboard shows no styles / JSON on screen | Browser fetched CSS/JS without key | Make sure you're on the latest deploy (asset routes are now public) |
| `403 Invalid security key` | Wrong key | Verify `SECURITY_DASHBOARD_SECRET` in Railway matches what you're using |
| `SECURITY_DASHBOARD_SECRET not configured` | Env var missing | Add it in Railway → Variables |
| Scan returns `Claude API error` | Invalid `ANTHROPIC_API_KEY` | Check key at console.anthropic.com |
| Scan times out | Codebase too large | `MAX_FILE_SIZE` (400 KB) and 80 KB chunk limit are hard-coded — large repos take longer |
| `mysqldump: command not found` | Not in PATH | Add `which mysqldump` to startup logs; on Railway it should be at `/usr/bin/mysqldump` |
| `Drive permission denied` | Folder not shared with service account | Re-share the Drive folder with the service account email as Editor |
| `ENOENT: history.json` | First run, file doesn't exist yet | Normal — storage creates it on first save |
| SMTP `535 Authentication failed` | Wrong password or 2FA not enabled | For Gmail, use App Password (not account password); for ProtonMail, use Bridge password |

---

## Security Considerations

- **Rotate `SECURITY_DASHBOARD_SECRET` immediately** if it was ever logged, shared, or committed. Generate a new one: `openssl rand -hex 32`.
- Use HTTPS in production (Railway provides it automatically on `.railway.app` and custom domains with cert).
- Rotate the Google service account JSON key every 90 days: GCP Console → Service Accounts → Keys → Add Key, then delete the old one and update `GOOGLE_SERVICE_ACCOUNT_JSON`.
- The dashboard key uses constant-time comparison (`timingSafeEqual`) to prevent timing attacks.
- Scan results stored in `.security-scans/history.json` may contain file paths and vulnerability details — don't expose this directory publicly.
