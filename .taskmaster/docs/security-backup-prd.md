# Agente de Seguridad y Backup — PRD

Integrate two systems into an existing Express/TypeScript backend deployed on Railway:

1. A security agent powered by Claude API that scans the codebase,
   identifies vulnerabilities, displays them in an interactive admin dashboard,
   explains threats, generates remediation guides, and sends email reports.

2. An automated MySQL database backup system that compresses dumps using gzip
   (.sql.gz extension), stores them locally with rotation, and uploads them
   automatically to Google Drive using a Service Account via the googleapis SDK.

Both systems must coexist without modifying existing routes, must be fully typed
in TypeScript, and must be compatible with Railway's ephemeral filesystem.

---

## Tech Stack (existing, do not change)

- Runtime: Node.js
- Framework: Express.js
- Language: TypeScript (target ES2017, respect existing tsconfig.json)
- ORM: Prisma (MySQL)
- Deploy: Railway
- All new files must be .ts

---

## SYSTEM 1: Security Agent

### 1.1 File Structure to Create

src/security-agent/
  types.ts             - All TypeScript interfaces for the agent
  scanner.ts           - Recursive file reader and chunker
  analyzer.ts          - Claude API integration (claude-sonnet-4-6)
  reporter.ts          - Merge and format scan results
  emailer.ts           - Nodemailer HTML email sender
  storage.ts           - JSON-based scan history (max 20 records)
  middleware.ts        - X-Security-Key header authentication
  dashboard/
    index.html         - Full interactive dashboard UI
    styles.css         - Cybersecurity dark theme
    app.js             - Vanilla JS frontend logic

src/routes/security.routes.ts  - Express router for all security endpoints

### 1.2 TypeScript Interfaces (types.ts)

Define these exact interfaces:

  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  Difficulty: 'EASY' | 'MEDIUM' | 'COMPLEX'
  ScanStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

  FixGuide { steps, code_before, code_after, difficulty, estimated_time }
  Vulnerability { id, title, severity, file, line, code_snippet, description,
    attack_scenario, business_impact, owasp_reference, cve_reference?,
    fix_guide, resolved, resolved_at? }
  ScanResult { scan_id, timestamp, project_name, files_scanned, security_score,
    vulnerabilities, scan_summary, status, duration_ms }

### 1.3 Scanner (scanner.ts)

- Read recursively from paths in SECURITY_SCAN_PATHS env var
- Include: .ts, .js, .json (except package-lock), .env.example
- Exclude: node_modules, dist, .git, *.test.ts, *.spec.ts, coverage
- Skip files larger than 400KB (log warning)
- Group files into chunks of max 80KB each for Claude API
- Return: array of chunks with file metadata (name, path, size, lines)

### 1.4 Analyzer (analyzer.ts)

- Install: npm install @anthropic-ai/sdk
- Use model: claude-sonnet-4-6
- Timeout per request: 60 seconds
- Retry failed chunks once before marking as analysis_failed

System prompt for Claude:
You are a cybersecurity expert specialized in TypeScript/Node.js/Express
code auditing. Analyze the provided source code and return ONLY a valid
JSON object, no markdown, no extra text.

JSON schema:
{
  "vulnerabilities": [...],
  "security_score": 75,
  "scan_summary": "Executive summary in 2-3 sentences"
}

Look specifically for: SQL injection in raw Prisma queries, hardcoded
secrets, JWT misconfiguration, CORS misconfiguration, missing rate limiting,
weak input validation, error handling exposing stack traces, path traversal,
prototype pollution, command injection, unvalidated env vars, logging
sensitive data, IDOR in Prisma queries.

If no real vulnerabilities found, return empty array with high score.
NEVER invent vulnerabilities.

### 1.5 Storage (storage.ts)

- Save history to .security-scans/history.json
- Create directory if it does not exist
- Max 20 scans (delete oldest)
- Add .security-scans/ to .gitignore
- Methods: saveResult, getLatest, getHistory, markResolved(id)
- Handle corrupted JSON gracefully

### 1.6 Emailer (emailer.ts)

- Install: npm install nodemailer @types/nodemailer
- Inline HTML template with shield header, scan date, Security Score colored
  (80-100 green, 50-79 yellow, 0-49 red), table of CRITICAL+HIGH vulns,
  executive summary, "View Full Report" button, footer
- Log and return structured error if SMTP fails

### 1.7 API Routes (security.routes.ts)

All routes protected by X-Security-Key header or ?key= query param.

GET  /security                        Serve dashboard HTML
GET  /security/assets/styles.css      Serve dashboard CSS
GET  /security/assets/app.js          Serve dashboard JS
POST /api/security/scan               Start async scan (respond immediately)
GET  /api/security/status/:scan_id    Polling endpoint
GET  /api/security/results            Latest completed scan
GET  /api/security/history            All scans
POST /api/security/email              Send email report
PATCH /api/security/vuln/:id/resolve  Mark vulnerability resolved

### 1.8 Dashboard UI

Dark cybersecurity theme. Sections:
1. Header stats bar: Security Score animated, 4 counters, Scan button, Email button
2. Vulnerability list: filter by severity, search bar, severity-colored cards
3. Detail modal: 3 tabs (Description / Fix Guide / References), code diff, Mark Resolved
4. Scan progress overlay: terminal-style progress bar, file log polling
5. Scan history: table with score trend, Canvas-based line chart
6. Backups section: last backup info, Run Backup Now button, Drive history table, countdown

JS: Poll status every 2s, sessionStorage for key, X-Security-Key on all fetches, toasts.

---

## SYSTEM 2: Database Backup to Google Drive

### 2.1 File Structure to Create

src/backup/
  types.ts
  dumper.ts
  uploader.ts
  cleaner.ts
  scheduler.ts
  index.ts

src/routes/backup.routes.ts

### 2.2 Dumper (dumper.ts)

- Use child_process.spawn to run mysqldump
- Extract connection params from DATABASE_URL env var (Prisma format)
  Parse: mysql://USER:PASSWORD@HOST:PORT/DATABASE
- Flags: --single-transaction --quick --routines --triggers
- Pipe output through gzip > ./backups/DB_NAME_YYYY-MM-DD_HH-MM-SS.sql.gz
- Create ./backups/ directory if not exists
- Add ./backups/ to .gitignore
- Return: { filePath, fileName, sizeBytes, durationMs }
- Verify file exists and size > 0 after dump

### 2.3 Uploader (uploader.ts)

- Install: npm install googleapis
- Auth: Google Service Account JSON from GOOGLE_SERVICE_ACCOUNT_PATH
- Upload to folder GOOGLE_DRIVE_BACKUP_FOLDER_ID
- Resumable upload for files > 5MB, multipart for smaller
- Return: { driveFileId, driveFileName, webViewLink }
- Delete local file after successful upload
- Retry once on failure

### 2.4 Cleaner (cleaner.ts)

- Keep last BACKUP_LOCAL_KEEP_COUNT local backups (default 3)
- Keep last BACKUP_DRIVE_KEEP_COUNT Drive files (default 30)
- Delete oldest Drive files beyond limit using Drive API files.delete
- Log deletions

### 2.5 Scheduler (scheduler.ts)

- Install: npm install node-cron @types/node-cron (already installed)
- Default: daily at 2:00 AM ("0 2 * * *")
- Configurable via BACKUP_CRON_SCHEDULE env var
- Flow: dumper -> uploader -> cleaner -> log
- Store last result in memory for status endpoint
- On failure: log error, do not crash

### 2.6 Backup API Routes (backup.routes.ts)

All routes protected by same X-Security-Key middleware.

POST /api/backup/trigger             Manual backup trigger
GET  /api/backup/status              Last backup info
GET  /api/backup/history             List Drive backup files

---

## Integration into Main Server

- Mount security router: app.use('/', securityRouter)
- Mount backup router: app.use('/', backupRouter)
- Call scheduler.start() after server starts
- Add comment: // === Security Agent & Backup System ===
- Do NOT modify any existing routes or middleware

---

## Environment Variables

# Security Agent
ANTHROPIC_API_KEY=sk-ant-your-key-here
SECURITY_DASHBOARD_SECRET=change-this-32-char-minimum-secret
SECURITY_SCAN_PATHS=./src
SECURITY_EMAIL_TO=you@email.com
SECURITY_EMAIL_FROM=security@yourdomain.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx

# Database Backup
GOOGLE_SERVICE_ACCOUNT_PATH=./google-service-account.json
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your-folder-id-from-drive-url
BACKUP_CRON_SCHEDULE=0 2 * * *
BACKUP_LOCAL_KEEP_COUNT=3
BACKUP_DRIVE_KEEP_COUNT=30

---

## Railway Compatibility

- Use path.join(__dirname, ...) for all file paths
- Create directories with fs.mkdirSync({ recursive: true }) at startup
- Local .security-scans/ and ./backups/ reset on deploy (ephemeral filesystem)
- Backups uploaded to Drive before local deletion
- google-service-account.json in .gitignore

---

## Implementation Order (Phases)

Phase 1 - Foundation: security types.ts, backup types.ts
Phase 2 - Core services: scanner.ts, storage.ts, dumper.ts
Phase 3 - Integrations: analyzer.ts, emailer.ts, uploader.ts, cleaner.ts
Phase 4 - Orchestration: reporter.ts, scheduler.ts, middleware.ts
Phase 5 - API Layer: security.routes.ts, backup.routes.ts
Phase 6 - UI: dashboard/styles.css, dashboard/app.js, dashboard/index.html
Phase 7 - Integration: mount routers, start scheduler, update .gitignore, .env.example
Phase 8 - Documentation and validation: SECURITY_AGENT.md, tsc --noEmit, verify criteria

---

## Success Criteria

1. npx tsc --noEmit exits with 0 errors
2. GET /security?key=SECRET loads dashboard HTML
3. POST /api/security/scan returns { scan_id, status: "PENDING" }
4. GET /api/security/results returns ScanResult matching schema
5. POST /api/security/email sends HTML email
6. POST /api/backup/trigger creates .sql.gz and uploads to Drive
7. GET /api/backup/status returns last backup metadata
8. Backup section visible in dashboard
9. SECURITY_AGENT.md documents all setup including Google Drive
