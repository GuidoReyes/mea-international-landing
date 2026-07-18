# Task ID: 139

**Title:** Extend Prisma schema for manual deposit payment tracking

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Add new fields to PagoSuscripcion model to support manual bank deposit workflow with Drive storage

**Details:**

In backend/prisma/schema.prisma, extend the PagoSuscripcion model with:
- comprobanteUrl String? — Google Drive webViewLink to the uploaded receipt
- comprobanteDriveId String? — Google Drive file ID for future operations (delete/move)
- mesPagado String? — month covered by this payment in 'YYYY-MM' format

No enum changes needed — PagoEstado already has PENDIENTE/COMPLETADO/RECHAZADO, SuscripcionEstado has PENDIENTE/ACTIVA, and Suscripcion.proveedor is already a free String (will use 'manual_deposito').

After schema update, run 'npx prisma migrate dev --name add_comprobante_fields' and 'npx prisma generate'.

Validation: Check that the migration creates the three new nullable columns without errors.

**Test Strategy:**

Run migration in dev environment, verify schema compiles with 'tsc --noEmit', check that PrismaClient types now include the new fields on PagoSuscripcion
