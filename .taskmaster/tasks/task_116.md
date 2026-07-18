# Task ID: 116

**Title:** Refactor app/cursos/page.tsx to display Ruta cards

**Status:** done

**Dependencies:** 115 ✓

**Priority:** medium

**Description:** Replace CursoOnline listing with Ruta catalog using getRutas()

**Details:**

1. Update app/cursos/page.tsx: replace getCursosOnline() call with getRutas()
2. Update CatalogoCursos component (or create new CatalogoRutas) to map Ruta objects instead of CursoOnline
3. Each Ruta card displays: titulo, nivel badge (colored by getNivelBadgeColor), totalLecciones count, first line of descripcion, icono from lucide-react
4. Order cards by Ruta.orden field (general first)
5. Link each card to /cursos/[slug] (route already exists, will be refactored in next task)
6. Update page metadata: title "Rutas de Aprendizaje" instead of "Cursos", description mentions 7 specialized tracks
7. Keep existing CTA to /planes at bottom
8. Use MEA colors #0A2540 (primary dark) and #00C4B4 (accent teal) per globals.css, NO other colors
9. Remove tabs/filtering by track (old CursoOnline pattern) - Rutas are flat list

**Test Strategy:**

1. Visit /cursos, verify 7 Ruta cards rendered in correct orden
2. Verify "Inglés General" card shows nivel badge "A1-C1" in appropriate color
3. Verify specialized Rutas show correct nivel ranges (e.g., viajar: A1-A2)
4. Test totalLecciones count matches backend data
5. Verify lucide-react icons render correctly (Globe, Plane, etc.)
6. Test responsive layout on mobile/desktop
7. Verify links navigate to /cursos/[slug]
