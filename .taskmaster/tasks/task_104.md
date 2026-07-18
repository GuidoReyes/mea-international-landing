# Task ID: 104

**Title:** Implementar script generate-leccion.ts para generación LLM + TTS + almacenamiento

**Status:** done

**Dependencies:** 97 ✓, 98 ✓, 99 ✓, 103 ✓

**Priority:** high

**Description:** Pipeline CLI que llama a Anthropic para generar LeccionContenido, sintetiza audios con Piper, sube a R2 y guarda en BD

**Details:**

Crear `backend/src/scripts/generate-leccion.ts` (similar a `seed-cursos-online.ts`). Parsear CLI args: `--curso`, `--capitulo`, `--tema`, `--nivel`, `--frases` (formato 'phraseEn|phraseEs;...'). Construir prompt para Claude Sonnet (ANTHROPIC_API_KEY) exigiendo JSON válido de `LeccionContenido` con reglas pedagógicas del PRD: por frase meta → listen_learn + reconocimiento + producción; cada 2 frases → listen_learn combinador + ejercicio; 15-18 pasos máx; feedback positivo en español neutro (Guatemala); diálogo funcional (taller/oficina). Llamar API con `messages: [{ role: 'user', content: prompt }]`, `model: 'claude-sonnet-4-20250514'`, `max_tokens: 4096`. Parsear respuesta con `leccionContenidoSchema.safeParse`. Si falla, reintentar 1 vez con mensaje de corrección ('El JSON generado tiene estos errores: {issues}. Por favor corrígelo.'). Si vuelve a fallar, abortar con error claro. Para cada paso con `audioUrl` pendiente (listen_learn, multiple_choice con audio): llamar `sintetizarAudioPiper(phraseEn, leccionId, pasoIndex)`, reemplazar placeholder por URL. Si sintetizarAudioPiper retorna undefined, dejar `audioUrl: ''` y loguear warning. Buscar/crear Capitulo (upsert), crear Leccion (upsert por slug generado desde `tema`), guardar `content` validado. Imprimir resumen al final (título, slug, pasos generados, audios sintetizados).

**Test Strategy:**

Prueba end-to-end local: ejecutar con frases de ejemplo, verificar que genere JSON válido, sintetice audios (si R2 configurado), y guarde en BD. Verificar que el JSON cumpla con el schema. Probar reintento en caso de JSON inválido (mock de Anthropic con respuesta inválida → corrección). Probar sin R2 configurado (modo degradado con audioUrl vacío). Verificar que no rompa si el Capitulo ya existe.
