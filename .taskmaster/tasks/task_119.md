# Task ID: 119

**Title:** Update /mis-cursos to show Ruta context alongside CursoOnline progress

**Status:** done

**Dependencies:** 118 ✓

**Priority:** low

**Description:** Optionally enhance progress page to show which Rutas contain the user's enrolled courses

**Details:**

1. This task is OPTIONAL per PRD ("certificado por Ruta queda fuera" - simplification conscious)
2. Current /mis-cursos groups progress by CursoOnline (inscripcionOnline.cursoOnlineId) - NO CHANGES to core logic
3. Enhancement: for each enrolled CursoOnline, query which Rutas include its Lecciones via RutaLeccion
4. Display small badge on course card: "También en: Viajar, Restaurantes" (list of Ruta titulos)
5. Clicking Ruta badge navigates to /cursos/{rutaSlug}
6. This is informational only - progress calculation and certificates remain grouped by CursoOnline
7. If time-constrained, SKIP this task entirely (PRD allows it: "es una simplificación consciente")

**Test Strategy:**

1. Enroll in ingles-general, complete some lecciones
2. Visit /mis-cursos, verify progress shows under "Inglés General" course
3. If enhancement implemented: verify badges show "También en: Inglés General, Viajar" (if lecciones overlap)
4. Test progress percentage calculation unchanged (still based on CursoOnline total lecciones)
5. Verify certificates still reference cursoOnlineId, not rutaId
6. Test skipping this task doesn't break existing functionality
