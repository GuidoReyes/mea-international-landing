# Task ID: 175

**Title:** Generar lección: Cambio de aceite y filtros (Inglés para Talleres Mecánicos, A1)

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Generar el contenido interactivo de la Leccion #289 — "Cambio de aceite y filtros" (capítulo "Common Repairs", curso "Inglés para Talleres Mecánicos", nivel A1).

**Details:**

Comando: PIPER_VOICE_PATH=<path-al-voice-model> railway run npm run generate:leccion -- 289 "Cambio de aceite y filtros"
Curso: Inglés para Talleres Mecánicos (slug: ingles-talleres-mecanicos, ruta: talleres)
Capítulo: Common Repairs | Nivel: A1
Usar la Lección #1 de A1 ("Saludos básicos y despedidas") como molde de estructura y calidad: 7 tipos de paso disponibles, imágenes fotorrealistas de personas 100% ficticias (Gemini Interactions API), audio Piper verificado por bytes, sin señuelos en "ordenar" (el .refine() de Zod ya lo impide, no lo toques).
IMPORTANTE — no duplicar con "general": este curso es vocacional, el ángulo debe ser el del profesional/trabajador (o del turista en tránsito para "viajar"), nunca el genérico que ya cubre Inglés General. Ver reglas de no-duplicación en .taskmaster/docs/expansion-500-lecciones.md.

**Test Strategy:**

Verificar en el resumen del script: 8-12 pasos generados, audios subidos (no saltados) para vocabulario/escuchar/ordenar, imágenes generadas o reusadas de la librería para todos los pasos de vocabulario, 0 errores de validación Zod. Revisar visualmente en /cursos/{ruta}/leccion/{slug} si es una de las primeras lecciones de su curso.
