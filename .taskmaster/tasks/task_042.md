# Task ID: 42

**Title:** Create /admin/ediciones page with grouping by curso

**Status:** pending

**Dependencies:** 30 ✓

**Priority:** medium

**Description:** Build ediciones list page with curso grouping, filters, and creation modal

**Details:**

Create app/admin/ediciones/page.tsx. Fetch /api/ediciones with include curso. Group ediciones by curso.id (use Map or Object.groupBy). Render sections: each curso as header, ediciones as table rows below. Columns: Nombre, Fechas (start - end formatted), Precio (GTQ with USD if available), Inscritos/Cupo (e.g., '12/20'), Estado (activo badge). Filter dropdown: select curso (populate from /api/cursos). Button 'Nueva edición' opens modal: select curso, inputs: nombre, fechaInicio (date), fechaFin, precio, precioUSD?, cupo, instructor?. POST /api/ediciones. Skeleton + empty state.

**Test Strategy:**

Create edicion, verify appears under correct curso. Test curso filter. Verify precio displays both currencies. Check inscritos count matches. Test date formatting.
