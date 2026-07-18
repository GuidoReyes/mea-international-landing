# Task ID: 161

**Title:** Add password reset functionality in admin panel

**Status:** done

**Dependencies:** 158 ✓

**Priority:** medium

**Description:** Create admin UI button and endpoint to reset alumno password and send temp password via WhatsApp

**Details:**

In admin alumno detail page (app/admin/alumnos/[id]/page.tsx), add 'Resetear contraseña' button. On click, confirm dialog → calls admin endpoint POST /api/admin/alumnos/:id/reset-password (create in backend/src/routes/alumnos.ts under admin auth middleware). Endpoint: generates random 12-char tempPassword (letters+numbers), hashes with bcrypt, updates Alumno.password + sets primerLogin=true. If Alumno.whatsapp exists, calls sendWhatsAppMessage with 'Tu nueva contraseña temporal es: {tempPassword}. Cambiala en tu próximo ingreso.'. Returns success/temp password to admin UI (show in alert for fallback). Include audit log entry. Verify admin session has permission.

**Test Strategy:**

Test as admin: click reset button, verify confirmation dialog, verify password updated in DB (hashed), verify WhatsApp message sent if whatsapp set, verify primerLogin flag set, verify audit log entry created, test without whatsapp (manual temp password shown), verify alumno can login with temp password and is prompted to change it
