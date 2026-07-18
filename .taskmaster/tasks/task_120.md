# Task ID: 120

**Title:** Integration testing and cache invalidation

**Status:** done

**Dependencies:** 111 ✓, 112 ✓, 113 ✓, 114 ✓, 118 ✓

**Priority:** medium

**Description:** End-to-end testing of Rutas feature and Redis cache invalidation strategy

**Details:**

1. Test complete user flow: anonymous user browses /cursos → clicks general Ruta → explores A1 tab → clicks free leccion → views content
2. Test authenticated flow: alumno with active subscription browses /cursos → clicks call-center Ruta → verifies all B2-C1 lecciones unlocked → completes a lesson → returns to Ruta page, sees progress
3. Test cache invalidation: after running seed-curriculum.ts, verify GET /api/rutas and GET /api/rutas/:slug/curriculum return fresh data (clear Redis keys: DEL rutas:all, DEL rutas:curriculum:*)
4. Create cache warming script (optional): backend/src/scripts/warm-rutas-cache.ts that pre-fetches all Rutas into Redis after seed
5. Test Redis failure mode: stop Redis, verify all endpoints gracefully fall back to Prisma queries
6. Load test: simulate 100 concurrent requests to /api/rutas/:slug/curriculum, verify acceptable response time with Redis (<100ms) and without (<500ms)
7. Verify no N+1 query issues: enable Prisma query logging, count queries per endpoint call (should be O(1) with proper includes/joins)

**Test Strategy:**

1. Run seed-curriculum.ts, verify 7 Rutas + ~150-200 Lecciones created
2. Clear Redis cache, hit /cursos, verify data loads correctly
3. Check Redis cache populated after first request
4. Test anonymous vs authenticated access to locked lecciones
5. Verify ProgresoLeccion updates correctly from Ruta-based lesson pages
6. Test all 7 Rutas render correctly on /cursos with correct nivel badges
7. Verify no broken links in Ruta → Leccion navigation
8. Check Prisma query count: should be 2-3 queries per curriculum endpoint (not 50+)
