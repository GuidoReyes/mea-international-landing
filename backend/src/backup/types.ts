export type BackupStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface DumpResult {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  durationMs: number;
}

export interface UploadResult {
  driveFileId: string;
  driveFileName: string;
  webViewLink: string;
}

export interface BackupResult {
  status: BackupStatus;
  timestamp: string;
  fileName?: string;
  filePath?: string;
  sizeBytes?: number;
  durationMs?: number;
  driveFileId?: string;
  driveFileName?: string;
  webViewLink?: string;
  error?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  webViewLink: string;
}

export interface DbConnectionParams {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}
