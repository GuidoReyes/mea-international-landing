# Task ID: 113

**Title:** Implement GET /api/rutas backend endpoint

**Status:** done

**Dependencies:** 112 ✓

**Priority:** high

**Description:** Create backend/src/routes/rutas.ts with public catalog endpoint matching cursos-online pattern

**Details:**

1. Create `backend/src/routes/rutas.ts` Express router
2. GET /api/rutas endpoint: query Ruta where publicada=true, orderBy orden asc
3. Include count of RutaLeccion per Ruta (totalLecciones)
4. Return RutaResumen interface: id, slug, titulo, descripcion, nivelMinimo, nivelMaximo, icono, proximamente, totalLecciones
5. Implement Redis caching with key `rutas:all`, TTL from COURSE_CACHE_TTL (same as cursos-online)
6. Use same try/catch Redis pattern as cursos-online.ts (graceful degradation if Redis unavailable)
7. Register router in backend/src/index.ts: app.use('/api/rutas', rutasRouter)
8. Import getJSON/setJSON from lib/redis.ts, COURSE_CACHE_TTL from lib/redis.ts

**Test Strategy:**

1. Test GET /api/rutas returns exactly 7 Rutas in orden order
2. Verify totalLecciones counts match RutaLeccion rows per Ruta
3. Check response includes all fields: slug, titulo, descripcion, nivelMinimo, nivelMaximo, icono, proximamente
4. Test Redis caching: first request hits DB, second returns cached (check logs/timing)
5. Test graceful degradation: stop Redis, verify endpoint still works from DB
6. Verify proximamente field works (create test Ruta with proximamente=true, confirm excluded)
