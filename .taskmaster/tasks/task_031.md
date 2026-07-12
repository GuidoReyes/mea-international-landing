# Task ID: 31

**Title:** Implement /api/inscripciones routes including CSV import

**Status:** done

**Dependencies:** 30 ✓

**Priority:** medium

**Description:** Create inscripciones list/update routes and bulk CSV import endpoint with error handling

**Details:**

Create backend/src/routes/inscripciones.ts. Install multer: npm install multer @types/multer in backend. GET /api/inscripciones: paginated list with filters (estado, alumnoId, edicionId). Include alumno, edicion. GET /api/inscripciones/:id: full detail with pagos and cuotas. PATCH /api/inscripciones/:id: change estado (validate enum). POST /api/inscripciones/importar-csv: use multer.single('file'), parse CSV with headers: carnet_o_email, edicion_id, monto, metodo. For each row: find alumno by carnet OR email, verify edicion exists, create inscripcion + pago in transaction. Collect {exitosos: number, errores: Array<{row, error}>}. Return JSON summary. Validate CSV structure with Zod. Apply auditLog.

**Test Strategy:**

Upload CSV with 10 rows (5 valid, 5 invalid alumno refs), verify response shows 5 exitosos, 5 errores with details. Check DB has 5 new inscripciones. Test malformed CSV returns 400.
