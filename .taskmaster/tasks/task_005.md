# Task ID: 5

**Title:** Implement CRUD Routes for Cursos

**Status:** done

**Dependencies:** 3 ✓, 4 ✓

**Priority:** medium

**Description:** Create API endpoints for managing courses: GET (list with cache), POST (create), PATCH (update and invalidate cache), DELETE (soft delete).

**Details:**

Create `src/routes/cursos.ts` with Express Router. Implement GET /api/cursos: check Redis cache key 'cursos:all', if hit return cached, if miss query Prisma for active courses, cache for 1 hour (3600s), return JSON array with pagination support (query params: page, limit). Implement POST /api/cursos (protected - will add auth later): validate request body (nombre, descripcion, precio, modalidad, duracion required), create with Prisma, invalidate cache, return created course. Implement PATCH /api/cursos/:id: validate id, update fields, invalidate cache. Implement DELETE /api/cursos/:id: soft delete (set activo=false), invalidate cache. Mount router in src/index.ts at `/api/cursos`. Add error handling middleware.

**Test Strategy:**

Test GET /api/cursos returns empty array initially. Create curso via POST (without auth for now). Verify GET returns cached data on second request (check Redis). Update a curso, verify cache is invalidated. Test pagination params. Verify soft delete sets activo=false.
