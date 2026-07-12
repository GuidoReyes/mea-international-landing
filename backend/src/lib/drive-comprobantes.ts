import { google } from "googleapis";
import { buildDriveClient, isDriveConfigured } from "../backup/drive-auth";
import { log } from "./logger";

const ROOT_FOLDER_NAME = "Pagos con depósito";

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
): Promise<string> {
  const escaped = name.replace(/'/g, "\\'");
  const query = `name = '${escaped}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const existing = await drive.files.list({ q: query, fields: "files(id)", pageSize: 1 });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return created.data.id!;
}

export interface SubirComprobanteParams {
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoCarnet: string;
  mes: string;
  buffer: Buffer;
  nombreArchivo: string;
  mimeType: string;
}

export interface ComprobanteSubido {
  driveFileId: string;
  url: string;
}

export async function subirComprobanteDeposito(
  params: SubirComprobanteParams
): Promise<ComprobanteSubido> {
  const rootFolderId = process.env.GOOGLE_DRIVE_PAGOS_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error(
      "GOOGLE_DRIVE_PAGOS_FOLDER_ID no está configurada. Creá una carpeta " +
        `"${ROOT_FOLDER_NAME}" en Google Drive, compartila con las credenciales de Drive ya ` +
        "configuradas, y agregá su id como variable de entorno."
    );
  }

  const drive = buildDriveClient();

  const carpetaAlumno = `${params.alumnoApellido}, ${params.alumnoNombre} (${params.alumnoCarnet})`;
  const alumnoFolderId = await findOrCreateFolder(drive, carpetaAlumno, rootFolderId);
  const mesFolderId = await findOrCreateFolder(drive, params.mes, alumnoFolderId);

  const { Readable } = await import("stream");
  const response = await drive.files.create({
    requestBody: {
      name: params.nombreArchivo,
      parents: [mesFolderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id,webViewLink",
  });

  log("info", `[DriveComprobantes] Comprobante subido: ${carpetaAlumno}/${params.mes}/${params.nombreArchivo}`);

  return {
    driveFileId: response.data.id!,
    url: response.data.webViewLink ?? "",
  };
}

export { isDriveConfigured };
