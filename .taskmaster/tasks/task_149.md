# Task ID: 149

**Title:** Integration testing and QA validation

**Status:** done

**Dependencies:** 146 ✓, 147 ✓, 148 ✓

**Priority:** high

**Description:** Execute comprehensive end-to-end testing of manual deposit flow from student checkout to admin approval, verify all acceptance criteria

**Details:**

Execute all acceptance criteria from PRD section 7:

1. Student flow:
   - Navigate to /checkout/[planPrecioId] as logged-in student
   - Verify bank account details displayed (Corporacion ME, Cuenta monetaria BI, GTQ-6930015505, exact amount)
   - Verify NO redirect to Recurrente
   - Upload receipt image/PDF with month selector
   - Verify success message shown

2. Drive verification:
   - Check Google Drive folder structure: 'Pagos con depósito' → '{Apellido}, {Nombre} ({Carnet})' → '{YYYY-MM}'
   - Verify uploaded file is accessible via comprobanteUrl link
   - Verify comprobanteDriveId is valid Drive file ID

3. Database verification:
   - PagoSuscripcion has estado=PENDIENTE, comprobanteUrl, comprobanteDriveId, mesPagado populated
   - Suscripcion has estado=PENDIENTE, proveedor='manual_deposito'

4. Admin flow:
   - Open /admin/pagos-deposito
   - Verify pending payment appears in table with student/plan info
   - Click 'Ver boleta' link, verify Drive file opens in new tab
   - Click 'Confirmar', verify:
     - PagoSuscripcion → estado=COMPLETADO, pagadoEn set
     - Suscripcion → estado=ACTIVA, fechaInicio set, fechaFin calculated correctly (same logic as Recurrente webhook)
   - Test reject flow with motivo text

5. Recurrente code integrity:
   - Verify lib/recurrente.ts unchanged
   - Verify routes/webhooks-recurrente.ts unchanged
   - Run 'tsc --noEmit' and production build, verify no compilation errors
   - Existing Recurrente checkout code path still compiles (even if not called by frontend)

6. Regression testing:
   - Verify existing features unaffected (CRM, admin panels, alumno login, courses)
   - No errors in console or server logs

Documentation: Create QA checklist document with screenshots showing each step completed

**Test Strategy:**

Full E2E test suite: (1) automated integration tests for all endpoints cover happy path and error cases, (2) manual QA walkthrough of complete student→admin flow with actual Drive uploads, (3) verify audit logs created, (4) load test checkout-manual rate limiting, (5) regression test existing suscripciones features, (6) verify production build succeeds with no TypeScript errors
