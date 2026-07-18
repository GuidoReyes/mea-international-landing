# Task ID: 81

**Title:** Integrate Security and Backup Routers into Main Server

**Status:** done

**Dependencies:** 79 ✓, 78 ✓

**Priority:** high

**Description:** Mount security and backup routers in src/index.ts, call startScheduler() on boot, update .gitignore and .env.example

**Details:**

In src/index.ts after line 18 (marketingRouter import), add:

import securityRouter from './routes/security.routes';
import backupRouter from './routes/backup.routes';
import { startScheduler as startBackupScheduler } from './backup/scheduler';

After line 67 (app.use('/api/marketing')), add:

// === Security Agent & Backup System ===
app.use('/', securityRouter);
app.use('/', backupRouter);

In app.listen callback after startScheduler() line 94, add:

startBackupScheduler();

Update .gitignore, add:

.security-scans/
backups/
google-service-account.json

Update .env.example, add:

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

Do NOT modify existing routes or middleware.

**Test Strategy:**

Run npm run build (tsc), verify dist/ compiles without errors, check .gitignore includes new directories, verify .env.example has all new variables, start server and confirm backup scheduler logs appear, test GET /health still returns 200, verify existing routes (/api/cursos, /api/auth) still work
