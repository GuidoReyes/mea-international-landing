# Task ID: 35

**Title:** Add CSV export endpoint to leads API

**Status:** done

**Dependencies:** 25 ✓

**Priority:** medium

**Description:** Implement GET /api/leads/export/csv with proper escaping and audit logging

**Details:**

In backend/src/routes/leads.ts, add GET /api/leads/export/csv route. Use verifyJWT. Accept same query params as GET /api/leads but no pagination (fetch all matching). Query leads with filters. Build CSV string: headers 'id,nombre,email,telefono,estado,interes,etapa,creadoEn'. For each lead, escape fields containing commas/quotes by wrapping in double quotes and escaping internal quotes. Use .map(lead => [lead.id, escapeCsv(lead.nombre), ...].join(',')).join('\n'). Set headers: Content-Type: text/csv; charset=utf-8, Content-Disposition: attachment; filename=leads-YYYY-MM-DD.csv (use current date). Register auditLog with accion='EXPORT_CSV', recurso='leads'. Return CSV string.

**Test Strategy:**

Export leads with special chars in nombre (commas, quotes), verify CSV parses correctly in Excel/Google Sheets. Verify audit log created. Test that query filters apply correctly.
