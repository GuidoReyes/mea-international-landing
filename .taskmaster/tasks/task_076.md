# Task ID: 76

**Title:** Implement Database Dumper and Uploader Modules

**Status:** done

**Dependencies:** 73 ✓

**Priority:** high

**Description:** Build src/backup/dumper.ts to create gzipped MySQL dumps and src/backup/uploader.ts to upload to Google Drive via Service Account

**Details:**

Create dumper.ts:

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DumpResult, DatabaseConfig } from './types';

function parseDatabaseUrl(url: string): DatabaseConfig {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
}

export async function dumpDatabase(): Promise<DumpResult> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');
  
  const config = parseDatabaseUrl(dbUrl);
  const backupDir = path.join(__dirname, '../../backups');
  fs.mkdirSync(backupDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${config.database}_${timestamp}.sql.gz`;
  const filePath = path.join(backupDir, fileName);
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const mysqldump = spawn('mysqldump', [
      `-h${config.host}`,
      `-P${config.port}`,
      `-u${config.user}`,
      `-p${config.password}`,
      '--single-transaction',
      '--quick',
      '--routines',
      '--triggers',
      config.database
    ]);
    
    const gzip = spawn('gzip');
    const output = fs.createWriteStream(filePath);
    
    mysqldump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(output);
    
    mysqldump.stderr.on('data', (data) => console.error('mysqldump error:', data.toString()));
    
    output.on('finish', () => {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) return reject(new Error('Dump file is empty'));
      resolve({
        filePath,
        fileName,
        sizeBytes: stat.size,
        durationMs: Date.now() - startTime
      });
    });
    
    output.on('error', reject);
  });
}

Create uploader.ts:

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { UploadResult } from './types';

export async function uploadToDrive(filePath: string, fileName: string): Promise<UploadResult> {
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH not set');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(serviceAccountPath),
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  
  const fileSize = fs.statSync(filePath).size;
  const uploadMethod = fileSize > 5 * 1024 * 1024 ? 'resumable' : 'multipart';
  
  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      },
      media: {
        mimeType: 'application/gzip',
        body: fs.createReadStream(filePath)
      },
      fields: 'id,name,webViewLink'
    }, {
      uploadType: uploadMethod as any
    });
    
    // Delete local file after successful upload
    fs.unlinkSync(filePath);
    
    return {
      driveFileId: response.data.id!,
      driveFileName: response.data.name!,
      webViewLink: response.data.webViewLink || ''
    };
  } catch (err) {
    // Retry once
    console.warn('Upload failed, retrying...');
    const retryResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      },
      media: {
        mimeType: 'application/gzip',
        body: fs.createReadStream(filePath)
      },
      fields: 'id,name,webViewLink'
    });
    
    fs.unlinkSync(filePath);
    
    return {
      driveFileId: retryResponse.data.id!,
      driveFileName: retryResponse.data.name!,
      webViewLink: retryResponse.data.webViewLink || ''
    };
  }
}

Both modules Railway-compatible with path.join(__dirname, ...).

**Test Strategy:**

dumper.ts: Mock spawn to verify mysqldump flags (--single-transaction, --quick, --routines, --triggers), test DATABASE_URL parsing with valid/invalid formats, verify .sql.gz file creation and size > 0 check. uploader.ts: Mock googleapis, verify Service Account auth, test resumable vs multipart upload selection (5MB threshold), confirm local file deletion after upload, validate retry logic

## Subtasks

### 76.1. Create backup types and interfaces module

**Status:** done  
**Dependencies:** None  

Create src/backup/types.ts defining TypeScript interfaces for DatabaseConfig, DumpResult, UploadResult, and BackupResult used by both dumper and uploader modules.

**Details:**

Create the src/backup directory structure and types.ts file. Define DatabaseConfig interface with fields: user, password, host, port (number), database (all strings except port). Define DumpResult with filePath, fileName, sizeBytes (number), durationMs (number). Define UploadResult with driveFileId, driveFileName, webViewLink (all strings). Define BackupResult combining dump and upload results with timestamp and success status. Follow the existing patterns from backend/src/types/express.d.ts for type definitions. Export all interfaces for use in dumper.ts and uploader.ts modules.

### 76.2. Implement DATABASE_URL parser and validation

**Status:** done  
**Dependencies:** 76.1  

Create src/backup/dumper.ts with parseDatabaseUrl function that extracts MySQL connection parameters from DATABASE_URL environment variable.

**Details:**

Create dumper.ts file importing DatabaseConfig from ./types. Implement parseDatabaseUrl(url: string): DatabaseConfig function using regex pattern /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/ to parse mysql://user:password@host:port/database format. Throw descriptive Error if DATABASE_URL is not set or format is invalid. Handle URL-encoded special characters in password using decodeURIComponent. Add validation for port number (must be numeric, 1-65535 range). Follow existing error handling patterns from backend/src/lib/logger.ts for consistency. Export parseDatabaseUrl for testing purposes.

### 76.3. Implement mysqldump execution with gzip compression

**Status:** done  
**Dependencies:** 76.2  

Complete src/backup/dumper.ts by implementing dumpDatabase function using child_process spawn to execute mysqldump and pipe output through gzip to create compressed backup files.

**Details:**

Import spawn from child_process, fs and path modules. Implement async dumpDatabase(): Promise<DumpResult> function. Create backups directory using path.join(__dirname, '../../backups') with fs.mkdirSync recursive:true for Railway compatibility. Generate timestamp filename format: {database}_{YYYY-MM-DDTHH-mm-ss}.sql.gz using ISO string with colons/dots replaced by dashes. Spawn mysqldump with flags: -h{host}, -P{port}, -u{user}, -p{password}, --single-transaction, --quick, --routines, --triggers, {database}. Pipe mysqldump.stdout to gzip.stdin, then gzip.stdout to fs.createWriteStream. Handle stderr for error logging using existing log() from lib/logger.ts. Verify output file size > 0 before resolving. Return DumpResult with filePath, fileName, sizeBytes, durationMs. Add cleanup on failure to remove partial files.

### 76.4. Implement Google Drive Service Account authentication

**Status:** done  
**Dependencies:** 76.1  

Create src/backup/uploader.ts with Google Drive API authentication using Service Account credentials from GOOGLE_SERVICE_ACCOUNT_PATH environment variable.

**Details:**

Install googleapis package: npm install googleapis @types/google-auth-library. Create uploader.ts importing google from googleapis, fs and path modules, UploadResult from ./types. Implement initDriveClient() helper function that: reads GOOGLE_SERVICE_ACCOUNT_PATH env var (throw Error if not set), creates GoogleAuth with keyFile using path.resolve for relative/absolute path handling, sets scope to 'https://www.googleapis.com/auth/drive.file', returns google.drive({version: 'v3', auth}). Add validation for service account JSON structure (should contain client_email, private_key). Use lazy initialization pattern to avoid loading credentials on module import. Log authentication success/failure using existing log() function pattern.

### 76.5. Implement Google Drive upload with retry logic

**Status:** done  
**Dependencies:** 76.4  

Complete src/backup/uploader.ts by implementing uploadToDrive function that uploads gzipped backup files to Google Drive folder with automatic retry on failure and local file cleanup.

**Details:**

Implement async uploadToDrive(filePath: string, fileName: string): Promise<UploadResult> function. Get drive client from initDriveClient(). Read GOOGLE_DRIVE_BACKUP_FOLDER_ID env var (optional - uploads to root if not set). Determine upload method based on file size: use 'resumable' for files > 5MB, 'multipart' for smaller files using fs.statSync. Call drive.files.create with requestBody: {name: fileName, parents: [folderId] if set}, media: {mimeType: 'application/gzip', body: fs.createReadStream(filePath)}, fields: 'id,name,webViewLink'. Implement single retry on failure with console.warn logging before retry. On successful upload (or successful retry), delete local file using fs.unlinkSync(filePath). Return UploadResult with driveFileId, driveFileName, webViewLink. Preserve local file if both attempts fail for manual recovery.
