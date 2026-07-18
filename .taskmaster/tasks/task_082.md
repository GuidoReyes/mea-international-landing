# Task ID: 82

**Title:** Create SECURITY_AGENT.md Documentation

**Status:** done

**Dependencies:** 81 ✓

**Priority:** low

**Description:** Write comprehensive setup guide covering installation, Google Drive setup, SMTP config, Railway deployment, and usage instructions

**Details:**

Create SECURITY_AGENT.md in backend/ directory with sections:

1. Overview: Explain both systems (Security Agent + Backup)
2. Prerequisites: Node 18+, MySQL, Google Cloud project, SMTP credentials
3. Installation: npm install commands (already done)
4. Google Drive Setup:
   - Create Service Account in GCP Console
   - Download JSON key file
   - Share Drive folder with service account email
   - Copy folder ID from Drive URL
5. Environment Variables: Complete .env reference with all required vars
6. SMTP Configuration: Gmail app passwords, other providers
7. Railway Deployment:
   - Add SERVICE_ACCOUNT_JSON as env var (base64 encoded)
   - Decode at runtime if needed
   - Explain ephemeral filesystem implications
8. Usage:
   - Access dashboard: https://your-app.railway.app/security?key=SECRET
   - Run manual scan: POST /api/security/scan
   - Trigger backup: POST /api/backup/trigger
   - Email reports: POST /api/security/email
9. Troubleshooting:
   - ANTHROPIC_API_KEY invalid
   - mysqldump not found in Railway
   - Google Drive permission denied
   - SMTP authentication failed
10. Security Considerations:
    - Keep SECURITY_DASHBOARD_SECRET complex (32+ chars)
    - Use HTTPS in production
    - Rotate service account keys regularly
11. Architecture: Brief explanation of scanner -> analyzer -> storage flow and dumper -> uploader -> cleaner flow

Include code examples for common tasks.

**Test Strategy:**

Manual review: verify all setup steps are complete and accurate, test following the guide from scratch in a new environment, confirm all env vars documented, validate Google Drive setup instructions work, verify Railway-specific notes are clear
