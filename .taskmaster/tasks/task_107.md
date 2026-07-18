# Task ID: 107

**Title:** Integrar LessonPlayer en página de lección existente con condicional según leccion.content

**Status:** done

**Dependencies:** 106 ✓, 100 ✓

**Priority:** high

**Description:** Modificar LeccionClient.tsx para renderizar LessonPlayer si content existe, o el viewer simple si content es null

**Details:**

Editar `components/cursos-online/LeccionClient.tsx` línea 154-226. Antes de renderizar el contenido simple (`ContenidoLeccion`), agregar condicional: si `leccion.content` existe (no null), hacer fetch a `GET /api/lecciones/{leccionId}/jugar` (agregar método en `lib/alumno-api.ts`: `jugarLeccion(leccionId): Promise<{ leccion: { id, titulo, content: LeccionContenido | null } }>`). Si content null, renderizar viewer simple (no cambiar). Si content existe, renderizar `<LessonPlayer leccionId={leccion.id} content={content} onExit={() => router.push(`/cursos/${cursoSlug}`)} />`. Importar LessonPlayer. Mantener el bloque de 'Marcar como completada' oculto cuando se usa LessonPlayer (el player maneja el guardado). No romper lecciones sin content (esGratis con urlContenido simple).

**Test Strategy:**

Prueba end-to-end: (1) lección sin content (urlContenido video/audio) → renderiza viewer simple + botón manual, (2) lección con content → renderiza LessonPlayer, completa pasos, verifica que se guarde el puntaje y se muestre certificado si corresponde, (3) lección bloqueada → muestra mensaje de upgrade sin romper. Probar con y sin suscripción activa.
