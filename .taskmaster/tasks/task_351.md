# Task ID: 351

**Title:** Generar lección: Establecer plazos (deadlines) (Inglés de Oficina, B1)

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Generar el contenido interactivo de la Leccion #357 — "Establecer plazos (deadlines)" (capítulo "Project Management", curso "Inglés de Oficina", nivel B1).

**Details:**

Comando: PIPER_VOICE_PATH=<path-al-voice-model> railway run npm run generate:leccion -- 357 "Establecer plazos (deadlines)"
Curso: Inglés de Oficina (slug: ingles-de-oficina, ruta: oficina)
Capítulo: Project Management | Nivel: B1
Usar la Lección #1 de A1 ("Saludos básicos y despedidas") como molde de estructura y calidad: 7 tipos de paso disponibles, imágenes fotorrealistas de personas 100% ficticias (Gemini Interactions API), audio Piper verificado por bytes, sin señuelos en "ordenar" (el .refine() de Zod ya lo impide, no lo toques).
IMPORTANTE — no duplicar con "general": este curso es vocacional, el ángulo debe ser el del profesional/trabajador (o del turista en tránsito para "viajar"), nunca el genérico que ya cubre Inglés General. Ver reglas de no-duplicación en .taskmaster/docs/expansion-500-lecciones.md.

**Test Strategy:**

Verificar en el resumen del script: 8-12 pasos generados, audios subidos (no saltados) para vocabulario/escuchar/ordenar, imágenes generadas o reusadas de la librería para todos los pasos de vocabulario, 0 errores de validación Zod. Revisar visualmente en /cursos/{ruta}/leccion/{slug} si es una de las primeras lecciones de su curso.
