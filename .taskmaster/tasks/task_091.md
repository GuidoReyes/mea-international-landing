# Task ID: 91

**Title:** Extender frontend: página /cursos/[slug] con progreso y estados por lección

**Status:** done

**Dependencies:** 87 ✓, 89 ✓

**Priority:** high

**Description:** Actualizar detalle de curso para mostrar progreso real, botón de inscripción y estados de lecciones

**Details:**

Modificar `app/cursos/[slug]/page.tsx`:

1. Hacer fetch con token de alumno si existe (usar `getAlumnoToken()` client-side o server-side con cookies)
2. Si NO hay inscripción, mostrar botón "Inscribirme gratis":
   - Al hacer click, llamar a `POST /api/cursos-online/:slug/inscribir` con auth
   - Recargar página después de inscripción exitosa

3. Si hay inscripción, mostrar:
   - Barra de progreso general del curso (progresoPorcentaje del endpoint)
   - Por cada lección, mostrar badge de estado:
     - **Completada** (check verde): `completada=true`
     - **Disponible** (desbloqueada): `bloqueada=false` y `completada=false`
     - **Bloqueada** (candado): `bloqueada=true`
   - Link a `/cursos/[slug]/leccion/[leccionSlug]` si desbloqueada
   - Tooltip o modal con CTA a `/planes` si bloqueada

4. Si todas las lecciones completadas y hay certificado, mostrar badge "Curso Completado" y link a certificado

Tecnologías: Next.js 16 (params es Promise), React hooks, Tailwind, Lucide icons

**Test Strategy:**

E2E tests:
- Usuario sin sesión ve solo lecciones gratuitas desbloqueadas
- Usuario con sesión sin inscripción ve botón de inscripción
- Inscripción exitosa actualiza UI
- Usuario inscrito con suscripción activa ve todas las lecciones desbloqueadas
- Usuario inscrito sin suscripción ve lecciones premium bloqueadas
- Progreso real se refleja en la barra
- Certificado aparece cuando curso 100% completado
