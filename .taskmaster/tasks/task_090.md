# Task ID: 90

**Title:** Crear frontend: página /mis-cursos con progreso real

**Status:** done

**Dependencies:** 87 ✓, 89 ✓

**Priority:** high

**Description:** Dashboard del alumno mostrando sus inscripciones, progreso y certificados

**Details:**

Crear `app/mis-cursos/page.tsx`:

1. Verificar sesión de alumno (leer token, si no existe redirigir a /alumno/login)
2. Crear endpoint `GET /api/alumnos/me/cursos` (auth alumno requerido) en backend:
   - Buscar todas las `InscripcionOnline` del alumno
   - Include: `cursoOnline.capitulos.lecciones`
   - Para cada inscripción, calcular:
     - Total lecciones
     - Lecciones completadas (join con ProgresoLeccion)
     - Porcentaje progreso
     - Certificado emitido (exists en CertificadoOnline)
   - Responder array de cursos con progreso

3. En el frontend, mostrar:
   - Card por cada curso inscrito
   - Barra de progreso con porcentaje real
   - Link al curso `/cursos/[slug]`
   - Badge "Completado" si progreso = 100%
   - Botón "Descargar Certificado" si existe certificado (link a `/api/certificados-online/:cursoOnlineId` con Authorization)
   - Si no hay inscripciones, CTA a `/cursos`

4. Header con:
   - Nombre del alumno
   - Estado de suscripción (llamar a `/api/suscripciones/me`)
   - Botón de logout

Tecnologías: Next.js App Router, React Server Components, fetch con auth

**Test Strategy:**

E2E tests:
- Página requiere autenticación
- Muestra cursos inscritos con progreso correcto
- Barra de progreso refleja lecciones completadas
- Certificado aparece solo si curso 100% completado y promedio >= 85
- Link de descarga funciona con auth
- Estado de suscripción visible en header
