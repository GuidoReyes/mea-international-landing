# Task ID: 142

**Title:** Implement POST /api/suscripciones/pagos/:pagoId/comprobante endpoint

**Status:** done

**Dependencies:** 140 ✓, 141 ✓

**Priority:** high

**Description:** Create multipart endpoint for students to upload payment receipt images/PDFs to Drive and link to PagoSuscripcion

**Details:**

In backend/src/routes/suscripciones.ts, add route POST /api/suscripciones/pagos/:pagoId/comprobante:

1. Middleware: verifyAlumnoJWT, multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
   - REUSE pattern from backend/src/routes/inscripciones.ts (lines 8-9)
2. Parse pagoId from params, validate is number
3. Fetch PagoSuscripcion with suscripcion.alumno relation
4. Verify ownership: suscripcion.alumnoId === req.alumno.alumnoId (403/404 if not)
5. Parse body field 'mesPagado' (YYYY-MM format, default to current month if not provided)
6. Validate mesPagado format with regex /^\d{4}-\d{2}$/
7. Check isDriveConfigured(), return 503 with clear message if false
8. Upload file:
   - Call subirComprobanteDeposito with alumno nombre/apellido/carnet, mes, req.file.buffer, req.file.originalname, req.file.mimetype
   - Get back { driveFileId, url }
9. Update PagoSuscripcion:
   - comprobanteUrl = url
   - comprobanteDriveId = driveFileId
   - mesPagado = mesPagado
   - estado stays PENDIENTE (manual approval required)
10. Response: { success: true, pagoId, comprobanteUrl }

Error handling: catch Drive errors, return 502 for upload failures, 503 if Drive not configured

**Test Strategy:**

Integration tests: (1) upload valid image creates Drive file and updates PagoSuscripcion, (2) unauthorized alumno gets 403, (3) invalid pagoId gets 404, (4) file exceeds 10MB gets 413, (5) missing mesPagado defaults to current month, (6) Drive not configured returns 503, (7) verify actual file appears in Drive folder hierarchy
