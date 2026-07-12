# Task ID: 6

**Title:** Implement CRUD Routes for Leads

**Status:** done

**Dependencies:** 3 ✓

**Priority:** medium

**Description:** Create API endpoints for managing leads: GET (list with filters and pagination), GET by ID (with conversations), PATCH (update status).

**Details:**

Create `src/routes/leads.ts` with Express Router. Implement GET /api/leads: support query params (estado, page=1, limit=10), query Prisma with where clause, include conversaciones count, order by creadoEn DESC, return paginated results with meta (total, page, limit). Implement GET /api/leads/:id: find by id, include conversaciones with mensajes (limit last 50), return 404 if not found. Implement PATCH /api/leads/:id: allow updating nombre, email, interes, estado fields, validate estado enum (nuevo, contactado, inscrito), update actualizadoEn automatically. Mount router at `/api/leads` in index.ts. These routes will be protected with JWT auth in later task.

**Test Strategy:**

Test GET /api/leads returns empty array. Create leads via Prisma (or will be created by WhatsApp bot). Test filtering by estado. Test pagination. Test GET by ID includes nested conversaciones. Test PATCH updates lead and actualizadoEn timestamp.
