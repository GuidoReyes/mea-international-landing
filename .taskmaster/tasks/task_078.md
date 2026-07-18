# Task ID: 78

**Title:** Implement Backup Scheduler and Middleware

**Status:** done

**Dependencies:** 76 ✓, 77 ✓

**Priority:** medium

**Description:** Build src/backup/scheduler.ts using node-cron for automated backups and src/security-agent/middleware.ts for X-Security-Key authentication

**Details:**

Create scheduler.ts:

import * as cron from 'node-cron';
import { dumpDatabase } from './dumper';
import { uploadToDrive } from './uploader';
import { cleanupOldBackups } from './cleaner';
import { BackupResult } from './types';

let lastBackupResult: BackupResult | null = null;

export function getLastBackupResult(): BackupResult | null {
  return lastBackupResult;
}

export async function runBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  try {
    const dump = await dumpDatabase();
    const upload = await uploadToDrive(dump.filePath, dump.fileName);
    await cleanupOldBackups();
    
    const result: BackupResult = {
      success: true,
      timestamp: new Date().toISOString(),
      dump,
      upload
    };
    lastBackupResult = result;
    console.log(`Backup completed in ${Date.now() - startTime}ms`);
    return result;
  } catch (err) {
    const result: BackupResult = {
      success: false,
      timestamp: new Date().toISOString(),
      error: String(err)
    };
    lastBackupResult = result;
    console.error('Backup failed:', err);
    return result;
  }
}

export function startScheduler(): void {
  const schedule = process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *';
  cron.schedule(schedule, () => {
    console.log('Running scheduled backup...');
    runBackup();
  });
  console.log(`Backup scheduler started: ${schedule}`);
}

Create middleware.ts:

import { Request, Response, NextFunction } from 'express';

export function securityKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const keyFromHeader = req.headers['x-security-key'] as string | undefined;
  const keyFromQuery = req.query.key as string | undefined;
  const expectedKey = process.env.SECURITY_DASHBOARD_SECRET;
  
  if (!expectedKey) {
    res.status(500).json({ error: 'SECURITY_DASHBOARD_SECRET not configured' });
    return;
  }
  
  if (keyFromHeader === expectedKey || keyFromQuery === expectedKey) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid or missing security key' });
  }
}

Scheduler starts on server boot, middleware protects all security/backup routes.

**Test Strategy:**

scheduler.ts: Mock cron.schedule and verify it's called with correct schedule string, test runBackup flow (dump -> upload -> cleanup), verify lastBackupResult is updated on success and failure. middleware.ts: Test with valid X-Security-Key header returns next(), valid ?key= query param returns next(), missing/invalid key returns 403, missing env var returns 500
