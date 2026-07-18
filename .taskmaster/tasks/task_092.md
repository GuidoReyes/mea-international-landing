# Task ID: 92

**Title:** Crear frontend: página de lección /cursos/[slug]/leccion/[leccionSlug]

**Status:** done

**Dependencies:** 85 ✓, 89 ✓, 91 ✓

**Priority:** high

**Description:** Vista de lección individual con contenido (video/audio/markdown) y botón de completar

**Details:**

Crear `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx`:

1. Verificar sesión de alumno (redirigir a /alumno/login si no existe)
2. Fetch del curso con progreso (usar endpoint modificado de tarea 87)
3. Buscar la lección por slug en la estructura de capítulos
4. Si `bloqueada=true`:
   - Mostrar candado y mensaje "Esta lección requiere un plan activo"
   - CTA a `/planes`
   - No mostrar contenido
5. Si `bloqueada=false`:
   - Mostrar `urlContenido`:
     - Si es URL de video (YouTube, Vimeo): embed con iframe responsive
     - Si es URL de audio: player HTML5 audio
     - Si es markdown: renderizar con `@tailwindcss/typography` (prose)
   - Mostrar botón "Marcar como completada"
   - Input opcional para puntaje (slider 0-100)
   - Al completar, llamar a `POST /api/lecciones/:id/completar` con `{ puntaje }`
   - Mostrar feedback si se emitió certificado
   - Link a siguiente lección si existe

6. Navigation:
   - Breadcrumb: Cursos > [nombreCurso] > [nombreCapitulo] > [nombreLeccion]
   - Botones prev/next para navegar entre lecciones

Tecnologías: Next.js App Router, React, markdown rendering, responsive iframe

**Test Strategy:**

E2E tests:
- Página requiere autenticación
- Lección bloqueada muestra candado y CTA a planes
- Lección desbloqueada muestra contenido correcto
- Video embed funciona (YouTube/Vimeo)
- Audio player funciona
- Markdown se renderiza correctamente
- Marcar como completada actualiza progreso
- Puntaje opcional se guarda correctamente
- Navegación prev/next funciona
