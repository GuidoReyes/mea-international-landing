import * as fs from "fs";
import { google } from "googleapis";
import { log } from "../lib/logger";
import { buildDriveClient } from "./drive-auth";
import type { UploadResult, DriveFile } from "./types";

async function createFile(
  drive: ReturnType<typeof google.drive>,
  filePath: string,
  fileName: string
): Promise<UploadResult> {
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  const fileSize = fs.statSync(filePath).size;
  const uploadType = fileSize > 5 * 1024 * 1024 ? "resumable" : "multipart";

  const response = await drive.files.create(
    {
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: "application/gzip",
        body: fs.createReadStream(filePath),
      },
      fields: "id,name,webViewLink",
    },
    { params: { uploadType } }
  );

  return {
    driveFileId: response.data.id!,
    driveFileName: response.data.name!,
    webViewLink: response.data.webViewLink ?? "",
  };
}

export async function uploadToDrive(filePath: string, fileName: string): Promise<UploadResult> {
  const drive = buildDriveClient();
  log("info", `[Uploader] Uploading ${fileName} to Google Drive`);

  let result: UploadResult;
  try {
    result = await createFile(drive, filePath, fileName);
  } catch (err) {
    log("warn", `[Uploader] First attempt failed, retrying: ${err instanceof Error ? err.message : String(err)}`);
    result = await createFile(drive, filePath, fileName);
  }

  fs.unlinkSync(filePath);
  log("info", `[Uploader] Uploaded successfully: ${result.driveFileName} (id=${result.driveFileId})`);
  return result;
}

export async function listDriveBackups(maxResults = 20): Promise<DriveFile[]> {
  const drive = buildDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : "trashed = false";

  const response = await drive.files.list({
    q: query,
    fields: "files(id,name,size,createdTime,webViewLink)",
    orderBy: "createdTime desc",
    pageSize: maxResults,
  });

  return (response.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    size: Number(f.size ?? 0),
    createdAt: f.createdTime!,
    webViewLink: f.webViewLink ?? "",
  }));
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = buildDriveClient();
  await drive.files.delete({ fileId });
  log("info", `[Uploader] Deleted Drive file: ${fileId}`);
}
