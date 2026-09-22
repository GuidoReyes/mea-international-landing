export const MIME_TO_EXT: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.ms-excel": "csv", // algunos navegadores envían este MIME para .csv
};

export interface UploadValidation {
  readonly valid: boolean;
  readonly extension: string;
  readonly error?: string;
}

/**
 * Validates an uploaded file against an allowlist of MIME types and derives the file
 * extension from the MIME type — never from the client-supplied filename. A filename
 * extension is fully attacker-controlled and, when used to name the stored file, lets a
 * .exe be uploaded as "boleta.png" and later served/opened as if it were an image.
 *
 * Known limitation: `file.mimetype` is also client-declared (multer reads it from the
 * request's Content-Type for that part), not sniffed from the actual bytes. This closes
 * the filename-spoofing path the task asked for; it does not replace magic-byte sniffing.
 */
export function validateUpload(file: Express.Multer.File, allowedMimes: readonly string[]): UploadValidation {
  if (!allowedMimes.includes(file.mimetype)) {
    return { valid: false, extension: "", error: `Tipo de archivo no permitido: ${file.mimetype}` };
  }
  const extension = MIME_TO_EXT[file.mimetype];
  if (!extension) {
    return { valid: false, extension: "", error: `Tipo de archivo no soportado: ${file.mimetype}` };
  }
  return { valid: true, extension };
}
