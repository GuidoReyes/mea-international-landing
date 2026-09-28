const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,50}$/;
const BACKUP_FILE_SUFFIX = ".sql.gz";
const BACKUP_FOLDER_LABEL = "GOOGLE_DRIVE_BACKUP_FOLDER_ID";

export function isValidDriveId(value: string): boolean {
  return DRIVE_ID_PATTERN.test(value);
}

/**
 * Returns the id when it is a well-formed Drive id, otherwise throws.
 * The message never echoes the value: it may be a secret or an injection attempt.
 */
export function requireDriveId(value: string, label: string): string {
  if (!isValidDriveId(value)) {
    throw new Error(`${label} no tiene un formato de ID de Drive válido`);
  }
  return value;
}

/**
 * Escapes a value placed inside single quotes in a Drive `q` query.
 * The backslash goes first: otherwise a trailing "\" would swallow the closing quote.
 */
export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function isBackupFileName(name: string): boolean {
  return name.endsWith(BACKUP_FILE_SUFFIX);
}

/**
 * Query for the backup listing. Without a folder it narrows by MIME type so it never
 * lists the whole account. Names are filtered in code with isBackupFileName, because
 * Drive's `name contains` matches word prefixes, not substrings.
 */
export function buildBackupListQuery(folderId?: string): string {
  if (folderId) {
    return `'${requireDriveId(folderId, BACKUP_FOLDER_LABEL)}' in parents and trashed = false`;
  }
  return "mimeType = 'application/gzip' and trashed = false";
}
