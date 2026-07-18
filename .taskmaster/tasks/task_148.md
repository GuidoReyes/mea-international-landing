# Task ID: 148

**Title:** Add environment variable documentation and validation

**Status:** done

**Dependencies:** 140 ✓

**Priority:** low

**Description:** Document new GOOGLE_DRIVE_PAGOS_FOLDER_ID environment variable and add runtime validation for Drive configuration

**Details:**

1. Update backend .env.example with new variable:
   GOOGLE_DRIVE_PAGOS_FOLDER_ID=  # Google Drive folder ID for 'Pagos con depósito' (create folder, share with service account, paste ID from URL)

2. Add validation in backend/src/lib/drive-comprobantes.ts:
   - At module level or in subirComprobanteDeposito, check process.env.GOOGLE_DRIVE_PAGOS_FOLDER_ID exists
   - If missing, throw error: 'GOOGLE_DRIVE_PAGOS_FOLDER_ID not configured. Create Drive folder, share with credentials, and set ID in environment.'

3. Update project README or deployment docs with setup instructions:
   - Create 'Pagos con depósito' folder in Google Drive
   - Share with same service account / OAuth credentials used for backups
   - Copy folder ID from URL (the long string after /folders/)
   - Set GOOGLE_DRIVE_PAGOS_FOLDER_ID in Railway/production environment

4. Verify existing Drive credentials work: GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON should already be configured from backup feature

Validation: Deployment checklist updated, 503 error message is clear when var missing

**Test Strategy:**

Manual test: (1) start backend without GOOGLE_DRIVE_PAGOS_FOLDER_ID, verify upload endpoint returns 503 with clear message, (2) set invalid folder ID, verify Drive API returns permission error, (3) set valid folder ID, verify uploads succeed and files appear in correct Drive location
