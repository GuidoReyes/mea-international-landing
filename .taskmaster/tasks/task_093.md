# Task ID: 93

**Title:** Conectar progreso real al catálogo /cursos

**Status:** done

**Dependencies:** 87 ✓, 89 ✓

**Priority:** medium

**Description:** Actualizar página de catálogo para mostrar progreso real en lugar de 0% fijo

**Details:**

Modificar `app/cursos/page.tsx` y `components/cursos-online/CatalogoCursos.tsx`:

1. Si hay sesión de alumno (token existe), hacer fetch de cursos con progreso:
   - Crear endpoint `GET /api/cursos-online?conProgreso=true` (auth alumno opcional)
   - Si hay alumno, incluir progresoPorcentaje para cada curso
   - Responder array con misma estructura más campo `progreso`

2. En el componente `CatalogoCursos`:
   - Recibir prop `progreso?: Record<string, number>` (map cursoId -> porcentaje)
   - Reemplazar barra de progreso fija (0%) por progreso real si existe
   - Mostrar badge "Completado" si progreso = 100%
   - Mantener diseño responsive y Tailwind existente

3. Optimización:
   - Cachear endpoint sin progreso en Redis (usuarios anónimos)
   - NO cachear endpoint con progreso (personalizado por alumno)

Tecnologías: Next.js App Router, React, fetch con auth opcional

**Test Strategy:**

E2E tests:
- Usuario sin sesión ve barras de progreso en 0%
- Usuario con sesión ve progreso real por curso
- Progreso se actualiza después de completar lecciones
- Badge "Completado" aparece en cursos 100% completados
- Performance: endpoint sin progreso usa caché
