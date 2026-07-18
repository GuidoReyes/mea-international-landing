# Task ID: 118

**Title:** Update app/cursos/[slug]/leccion/[leccionSlug]/page.tsx to resolve from Ruta

**Status:** done

**Dependencies:** 117 ✓

**Priority:** medium

**Description:** Modify lesson page to resolve leccionSlug within Ruta curriculum instead of CursoOnline

**Details:**

1. Update app/cursos/[slug]/leccion/[leccionSlug]/page.tsx to accept params: { slug: rutaSlug, leccionSlug }
2. Call getRutaCurriculum(rutaSlug) to fetch Ruta curriculum
3. Find Leccion by matching leccionSlug within curriculum (flatten capitulos.lecciones, Array.find by slug)
4. If not found in Ruta: return 404
5. Pass Leccion data to existing LeccionClient component (no changes needed to LeccionClient)
6. Breadcrumb trail: /cursos → /cursos/{rutaSlug} → current lesson titulo
7. "Inscribirme" CTA (if not inscrito): call POST /api/cursos-online/{cursoOnlineId}/inscribir using the real cursoOnlineId from Leccion.capitulo.cursoOnline (InscripcionOnline still references CursoOnline, not Ruta)
8. "Completar" action: call existing POST /api/lecciones/{leccionId}/completar - ProgresoLeccion still references leccionId directly
9. Progress and certificate logic UNCHANGED: still groups by CursoOnline in /mis-cursos
10. Ensure existing LeccionClient, inscripcion, and progreso endpoints work without modification

**Test Strategy:**

1. Navigate from /cursos/general (A1 tab) → click a leccion → verify lesson page loads
2. Verify breadcrumb shows correct Ruta slug (not CursoOnline slug)
3. Test "Inscribirme" CTA calls correct cursoOnlineId (verify in network tab)
4. Test "Completar" action updates ProgresoLeccion (check DB or /mis-cursos)
5. Verify bloqueada lecciones show upgrade CTA instead of content
6. Test lectiones from specialized Ruta (e.g., /cursos/viajar/leccion/...)
7. Verify 404 for invalid leccionSlug within valid Ruta
