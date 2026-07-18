# Task ID: 140

**Title:** Create Drive helper for receipt uploads

**Status:** done

**Dependencies:** 139 ✓

**Priority:** high

**Description:** Implement backend/src/lib/drive-comprobantes.ts to handle Google Drive folder structure and file uploads for payment receipts

**Details:**

Create backend/src/lib/drive-comprobantes.ts:

1. Import buildDriveClient and isDriveConfigured from '../backup/drive-auth' (REUSE, don't reimplement)
2. Export function subirComprobanteDeposito({ alumnoNombre, alumnoApellido, alumnoCarnet, mes, buffer, nombreArchivo, mimeType })
3. Implementation:
   - Get root folder ID from env var GOOGLE_DRIVE_PAGOS_FOLDER_ID
   - Search for or create subfolder '{apellido}, {nombre} ({carnet})' inside root
   - Search for or create subfolder '{mes}' (e.g. '2026-07') inside student folder
   - Upload file using drive.files.create with buffer as media body
   - Return { driveFileId: string, url: string } (webViewLink)

4. Use same pattern as backend/src/backup/uploader.ts for folder search/creation:
   - drive.files.list with q: "name='folder' and 'parentId' in parents and mimeType='application/vnd.google-apps.folder'"
   - drive.files.create with mimeType: 'application/vnd.google-apps.folder' if not found

5. Error handling: if isDriveConfigured() is false, throw clear error (will be caught by endpoint for 503 response)

**Test Strategy:**

Unit test with mocked Drive API: verify folder hierarchy creation logic, test file upload with sample buffer, verify returned driveFileId and url structure. Integration test uploads actual file to test Drive folder.
