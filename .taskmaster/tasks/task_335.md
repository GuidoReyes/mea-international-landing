# Task ID: 335

**Title:** Generar lección: Reclamos y devoluciones (Inglés General, B1)

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Generar el contenido interactivo de la Leccion #267 — "Reclamos y devoluciones" (capítulo "Online Shopping", curso "Inglés General", nivel B1).

**Details:**

Comando: PIPER_VOICE_PATH=<path-al-voice-model> railway run npm run generate:leccion -- 267 "Reclamos y devoluciones"
Curso: Inglés General (slug: ingles-general, ruta: general)
Capítulo: Online Shopping | Nivel: B1
Usar la Lección #1 de A1 ("Saludos básicos y despedidas") como molde de estructura y calidad: 7 tipos de paso disponibles, imágenes fotorrealistas de personas 100% ficticias (Gemini Interactions API), audio Piper verificado por bytes, sin señuelos en "ordenar" (el .refine() de Zod ya lo impide, no lo toques).
Este es un tema nuevo de Inglés General — verificar que no repite ninguno de los 228+ capítulos ya existentes en el curso.

**Test Strategy:**

Verificar en el resumen del script: 8-12 pasos generados, audios subidos (no saltados) para vocabulario/escuchar/ordenar, imágenes generadas o reusadas de la librería para todos los pasos de vocabulario, 0 errores de validación Zod. Revisar visualmente en /cursos/{ruta}/leccion/{slug} si es una de las primeras lecciones de su curso.
