# Task ID: 79

**Title:** Implement Security and Backup API Routes

**Status:** done

**Dependencies:** 74 ✓, 75 ✓, 77 ✓, 78 ✓

**Priority:** medium

**Description:** Build src/routes/security.routes.ts and src/routes/backup.routes.ts with all endpoints for scanning, results, email, backup trigger, and status

**Details:**

Create security.routes.ts:

import { Router, Request, Response } from 'express';
import * as path from 'path';
import { scanCodebase } from '../security-agent/scanner';
import { analyzeChunk } from '../security-agent/analyzer';
import { mergeChunkResults } from '../security-agent/reporter';
import { saveResult, getLatest, getHistory, markResolved } from '../security-agent/storage';
import { sendSecurityEmail } from '../security-agent/emailer';
import { securityKeyMiddleware } from '../security-agent/middleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Serve dashboard assets
router.get('/security', securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(__dirname, '../security-agent/dashboard/index.html'));
});

router.get('/security/assets/styles.css', securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(__dirname, '../security-agent/dashboard/styles.css'));
});

router.get('/security/assets/app.js', securityKeyMiddleware, (_req, res) => {
  res.sendFile(path.join(__dirname, '../security-agent/dashboard/app.js'));
});

// API endpoints
const scanStates = new Map<string, { status: string; progress?: number; log?: string[] }>();

router.post('/api/security/scan', securityKeyMiddleware, async (req: Request, res: Response) => {
  const scanId = uuidv4();
  scanStates.set(scanId, { status: 'PENDING', log: [] });
  
  res.json({ scan_id: scanId, status: 'PENDING' });
  
  // Run scan asynchronously
  (async () => {
    try {
      scanStates.set(scanId, { status: 'RUNNING', progress: 0, log: ['Starting scan...'] });
      const startTime = Date.now();
      const chunks = await scanCodebase();
      const totalChunks = chunks.length;
      
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkContent = chunk.files.map(f => `FILE: ${f.path}\n${f.content}`).join('\n\n');
        const analysis = await analyzeChunk(chunkContent);
        results.push(analysis);
        scanStates.get(scanId)!.progress = Math.round(((i + 1) / totalChunks) * 100);
        scanStates.get(scanId)!.log!.push(`Analyzed chunk ${i + 1}/${totalChunks}`);
      }
      
      const totalFiles = chunks.reduce((sum, c) => sum + c.files.length, 0);
      const result = mergeChunkResults(results, totalFiles, Date.now() - startTime);
      result.scan_id = scanId;
      saveResult(result);
      scanStates.set(scanId, { status: 'COMPLETED' });
    } catch (err) {
      console.error('Scan failed:', err);
      scanStates.set(scanId, { status: 'FAILED', log: [String(err)] });
    }
  })();
});

router.get('/api/security/status/:scan_id', securityKeyMiddleware, (req: Request, res: Response) => {
  const state = scanStates.get(req.params.scan_id);
  if (!state) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(state);
});

router.get('/api/security/results', securityKeyMiddleware, (_req, res) => {
  const latest = getLatest();
  if (!latest) {
    res.status(404).json({ error: 'No scans found' });
    return;
  }
  res.json(latest);
});

router.get('/api/security/history', securityKeyMiddleware, (_req, res) => {
  res.json(getHistory());
});

router.post('/api/security/email', securityKeyMiddleware, async (_req, res) => {
  const latest = getLatest();
  if (!latest) {
    res.status(404).json({ error: 'No scan results to email' });
    return;
  }
  const result = await sendSecurityEmail(latest);
  res.json(result);
});

router.patch('/api/security/vuln/:id/resolve', securityKeyMiddleware, (req: Request, res: Response) => {
  const success = markResolved(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Vulnerability not found' });
    return;
  }
  res.json({ success: true });
});

export default router;

Create backup.routes.ts:

import { Router, Request, Response } from 'express';
import { runBackup, getLastBackupResult } from '../backup/scheduler';
import { securityKeyMiddleware } from '../security-agent/middleware';
import { google } from 'googleapis';
import * as path from 'path';

const router = Router();

router.post('/api/backup/trigger', securityKeyMiddleware, async (_req, res) => {
  const result = await runBackup();
  res.json(result);
});

router.get('/api/backup/status', securityKeyMiddleware, (_req, res) => {
  const last = getLastBackupResult();
  if (!last) {
    res.status(404).json({ error: 'No backup history' });
    return;
  }
  res.json(last);
});

router.get('/api/backup/history', securityKeyMiddleware, async (_req, res) => {
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    res.status(500).json({ error: 'Google Service Account not configured' });
    return;
  }
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(serviceAccountPath),
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  
  const driveRes = await drive.files.list({
    q: folderId ? `'${folderId}' in parents and trashed=false` : 'trashed=false',
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime,size,webViewLink)',
    pageSize: 50
  });
  
  res.json(driveRes.data.files || []);
});

export default router;

Both routers use securityKeyMiddleware for all routes.

**Test Strategy:**

security.routes.ts: Test POST /api/security/scan returns scan_id and PENDING status, verify async scan updates scanStates map, test GET /api/security/status/:scan_id returns correct state, verify GET /api/security/results returns latest scan, test PATCH /api/security/vuln/:id/resolve marks vulnerability resolved. backup.routes.ts: Test POST /api/backup/trigger calls runBackup and returns result, verify GET /api/backup/status returns last backup, test GET /api/backup/history fetches Drive files with correct query. All routes should return 403 without valid security key.

## Subtasks

### 79.1. Create security.routes.ts with dashboard asset serving endpoints

**Status:** pending  
**Dependencies:** None  

Implement the security routes file with static dashboard assets serving (HTML, CSS, JS) protected by securityKeyMiddleware.

**Details:**

Create src/routes/security.routes.ts with Express Router. Import Router, Request, Response from express, path module, and securityKeyMiddleware from ../security-agent/middleware. Define three GET routes for dashboard assets: GET /security serves index.html, GET /security/assets/styles.css serves CSS, GET /security/assets/app.js serves JavaScript. All routes use securityKeyMiddleware for authentication via X-Security-Key header or ?key query param. Use res.sendFile with path.join(__dirname, '../security-agent/dashboard/...') for each asset. Export default router.

### 79.2. Implement security scan API endpoints with async scan management

**Status:** pending  
**Dependencies:** 79.1  

Add POST /api/security/scan endpoint that triggers async codebase scanning and GET /api/security/status/:scan_id for tracking scan progress.

**Details:**

In security.routes.ts, import uuid v4, scanCodebase, analyzeChunk, mergeChunkResults, saveResult from security-agent modules. Create scanStates Map<string, {status, progress?, log?}> for tracking in-memory scan states. Implement POST /api/security/scan: generate uuid scan_id, set initial PENDING state, return immediately with {scan_id, status}, then run async IIFE that: sets RUNNING status with progress 0, calls scanCodebase() to get chunks, iterates chunks calling analyzeChunk, updates progress percentage after each, merges results with mergeChunkResults, saves via saveResult, sets COMPLETED or FAILED status. Implement GET /api/security/status/:scan_id: lookup state in scanStates Map, return 404 if not found, otherwise return current state object.

### 79.3. Implement security results, history, email, and resolve endpoints

**Status:** pending  
**Dependencies:** 79.2  

Add GET /api/security/results, GET /api/security/history, POST /api/security/email, and PATCH /api/security/vuln/:id/resolve endpoints.

**Details:**

In security.routes.ts, import getLatest, getHistory, markResolved from storage and sendSecurityEmail from emailer. Implement GET /api/security/results: call getLatest(), return 404 if null, else return JSON result. Implement GET /api/security/history: call getHistory(), return JSON array. Implement POST /api/security/email: get latest result, return 404 if none, call sendSecurityEmail(latest) and return result object with success/error. Implement PATCH /api/security/vuln/:id/resolve: call markResolved(req.params.id), return 404 if false, else return {success: true}. All endpoints use securityKeyMiddleware.

### 79.4. Create backup.routes.ts with trigger, status, and history endpoints

**Status:** pending  
**Dependencies:** None  

Implement backup routes file with POST /api/backup/trigger, GET /api/backup/status, and GET /api/backup/history endpoints using Google Drive API.

**Details:**

Create src/routes/backup.routes.ts with Express Router. Import Router, Request, Response from express, runBackup and getLastBackupResult from ../backup/scheduler, securityKeyMiddleware from ../security-agent/middleware, google from googleapis, path module. Implement POST /api/backup/trigger: call await runBackup(), return result JSON with status, filename, driveFileId, timestamp. Implement GET /api/backup/status: call getLastBackupResult(), return 404 if null, else return last backup result. Implement GET /api/backup/history: check GOOGLE_SERVICE_ACCOUNT_PATH env var (500 if missing), create GoogleAuth with keyFile and drive.file scope, instantiate drive v3 client, call drive.files.list with GOOGLE_DRIVE_BACKUP_FOLDER_ID folder filter, orderBy createdTime desc, fields for id/name/createdTime/size/webViewLink, pageSize 50, return files array. All routes use securityKeyMiddleware. Export default router.

### 79.5. Register security and backup routes in main Express application

**Status:** pending  
**Dependencies:** 79.3, 79.4  

Import and mount security.routes.ts and backup.routes.ts in src/index.ts with appropriate path prefixes.

**Details:**

In src/index.ts, add imports for securityRouter from ./routes/security.routes and backupRouter from ./routes/backup.routes alongside existing route imports. Mount the routers after existing routes: app.use('/', securityRouter) for security dashboard at /security and API at /api/security/*, and app.use('/api/backup', backupRouter) for backup endpoints. Place these mounts after the json parser middleware but before the app.listen call. The security router handles both dashboard paths (/security) and API paths (/api/security/*) internally, so mount at root. Ensure both routers are registered with their securityKeyMiddleware protection applied per-route as defined in the route files.
