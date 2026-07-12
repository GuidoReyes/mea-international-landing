# Task ID: 40

**Title:** Create /admin/alumnos page with search and new alumno modal

**Status:** done

**Dependencies:** 29 ✓

**Priority:** high

**Description:** Build alumnos list page with table, search/filter, pagination, and creation modal

**Details:**

Create app/admin/alumnos/page.tsx as 'use client'. Fetch /api/alumnos with pagination. Table columns: Carnet (mono font), Nombre (apellido + nombre), Email, WhatsApp, Inscripciones (_count), Registrado (date format). Add search input (debounced 300ms) that queries nombre/email/carnet. Add activo toggle filter. Skeleton loading (similar to leads page). Empty state with Users icon. Click row navigates to /admin/alumnos/[id]. Add 'Nuevo alumno' button (top right) opens modal. Modal has form fields: nombre, apellido, email, whatsapp (optional, validate +502 format). On submit, POST /api/alumnos, close modal, refresh list. Use shadcn dialog component if available, or custom modal. Add to lib/api.ts: getAlumnos(page, search?, activo?), createAlumno(data).

**Test Strategy:**

Create alumno via modal, verify appears in table with generated carnet. Test search by carnet/email. Toggle activo filter. Verify pagination. Test validation (email format, required fields).
