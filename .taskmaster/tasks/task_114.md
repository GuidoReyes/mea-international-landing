# Task ID: 114

**Title:** Implement GET /api/rutas/:slug/curriculum endpoint

**Status:** done

**Dependencies:** 113 ✓

**Priority:** high

**Description:** Add curriculum detail endpoint with lesson access control and optional progress data

**Details:**

1. Add GET /api/rutas/:slug/curriculum to rutas.ts router
2. Use optionalAlumnoJWT middleware (same as cursos-online/:slug)
3. Query Ruta by slug where publicada=true, include RutaLeccion ordered by orden, join to Leccion → Capitulo → CursoOnline
4. Reconstruct response grouped by Capitulo (each Leccion already knows its capitulo via FK)
5. For slug==='general': order Capitulos by nivel field (A1, A2, B1, B2, C1) to enable tabs
6. For other slugs: order Capitulos by orden field
7. Apply access control per Leccion: if esGratis OR alumno has suscripcionActiva → bloqueada=false, expose urlContenido; else bloqueada=true, urlContenido=null
8. If alumnoId present: join ProgresoLeccion to include completada/puntaje fields per lesson
9. Return RutaCurriculum interface: id, slug, titulo, descripcion, nivelMinimo, nivelMaximo, capitulos (grouped), inscrito (always false - Rutas don't have inscriptions), suscripcionActiva
10. Cache anonymous requests only (with Redis key `rutas:curriculum:{slug}`)

**Test Strategy:**

1. Test anonymous request: bloqueada=true for non-free lessons, urlContenido=null
2. Test with alumno JWT + active subscription: all lessons bloqueada=false, urlContenido exposed
3. Test with alumno JWT without subscription: only esGratis lessons unlocked
4. Verify general Ruta response has capitulos ordered by nivel (A1 first, C1 last)
5. Verify viajar Ruta capitulos ordered by original orden field
6. Test completada/puntaje fields present when alumnoId exists
7. Verify 404 for non-existent slug or unpublished Ruta
