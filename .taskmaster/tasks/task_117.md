# Task ID: 117

**Title:** Refactor app/cursos/[slug]/page.tsx for Ruta detail with nivel tabs

**Status:** done

**Dependencies:** 116 ✓

**Priority:** high

**Description:** Update course detail page to resolve by Ruta slug and show A1-C1 tabs for general, single view for specialized

**Details:**

1. Update app/cursos/[slug]/page.tsx to call getRutaCurriculum(slug) instead of getCursoOnline(slug)
2. If slug === 'general': render tabs UI (A1 | A2 | B1 | B2 | C1) using shadcn/ui Tabs or custom pills, filter capitulos by nivel per selected tab
3. For each tab: render acordeones grouped by Capitulo, expandable to show Lecciones with lock icon (bloqueada), check icon (completada), gray text (locked)
4. If slug !== 'general': show badge "Nivel: {nivelMinimo}–{nivelMaximo}" at top, optional short section "¿Por qué este nivel?", single list of capitulos (no tabs)
5. Use MEA color palette: tabs active state #00C4B4, inactive #0A2540/50% opacity
6. Each Leccion links to /cursos/[rutaSlug]/leccion/[leccionSlug] (new route pattern - will be handled in next task)
7. Show progress indicator if alumno logged in: "X de Y lecciones completadas" with percentage bar
8. Update metadata to use Ruta titulo/descripcion
9. Handle 404 if Ruta not found

**Test Strategy:**

1. Visit /cursos/general, verify 5 tabs (A1-C1) render
2. Click A1 tab, verify only A1 capitulos/lecciones shown
3. Verify lecciones with esGratis=true show unlocked, others show lock icon
4. Visit /cursos/viajar, verify single view (no tabs), nivel badge "A1-A2"
5. Test logged-in alumno sees completada checkmarks and progress percentage
6. Test anonymous user sees all non-free lecciones locked
7. Verify /cursos/invalid-slug returns 404
