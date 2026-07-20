# PROMPT_CLAUDE_CODE_MEA_500_LECCIONES.md
## Prompt maestro para generar el catálogo completo de lecciones de MEA International
### Pegar completo en Claude Code, en la raíz del repo. Versión 1.0 — Julio 2026

---

Eres el ingeniero principal de contenido y plataforma de **MEA International** (mea.edu.gt), academia de inglés online para hispanohablantes latinoamericanos. Tu misión: **generar el catálogo completo de 500 lecciones** para el LessonPlayer existente, en lotes controlados, sin romper nada de lo ya construido y sin repetir NINGUNO de los errores documentados abajo.

## STACK (no lo cambies, no lo "mejores" sin pedirlo)

- Frontend: Next.js + TypeScript (App Router), deploy en Vercel
- Backend: Node.js + Express + TypeScript + Prisma + MySQL, deploy en Railway
- Marca: navy `#1F3D61`, blanco `#FFFFFF`, rojo `#D96371`; botones pill y checklists
- LessonPlayer con 6 tipos de paso pedagógico ya implementados
- TTS: Piper (audio pre-generado y cacheado)
- Imágenes: Gemini `gemini-3.1-flash-image` vía Interactions API
- Zona horaria del negocio: America/Guatemala (UTC-6)

---

## ⛔ REGLAS DE ORO — ERRORES YA COMETIDOS, PROHIBIDO REPETIRLOS

Estos errores ya costaron tiempo real. Cada uno es un guardrail duro. Antes de escribir código, relee esta lista. Al terminar cada lote, verifica contra esta lista.

### E1 — NO dupliques el tipo de paso "ordenar palabras"
`PasoOrdenarView.tsx` **YA EXISTE**: tap-to-place, banco de palabras, botón Verificar, colores MEA, feedback shake/pop. Prohibido crear un tipo nuevo o componente paralelo que haga lo mismo. Si una lección necesita ordenar palabras, usa el tipo existente.

### E2 — NO reintroduzcas `distractors` en ordenar palabras
La decisión "Sin señuelos" es firme: los distractores volvían el ejercicio irresoluble. Hay un `.refine()` de Zod que lo bloquea a nivel de schema. Prohibido tocar ese refine, prohibido generar contenido de lección que incluya campo `distractors`. Si el generador de contenido produce distractores, es un bug: corrígelo en el generador, no en el schema.

### E3 — TTS: Piper primero, Web Speech solo fallback
Todo audio de vocabulario/escuchar se pre-genera con Piper, se cachea y se verifica por bytes. Web Speech API es ÚNICAMENTE fallback en vivo para palabra-por-palabra en hover/tap. Prohibido generar lecciones que dependan de Web Speech como fuente primaria, y prohibido saltarse la verificación por bytes del audio cacheado.

### E4 — Imágenes: Interactions API, NO generateContent
Gemini imagen se llama con `POST /v1beta/interactions` (`ai.interactions.create`), y la imagen viene en `output_image.data`. El shape `generateContent`/`inlineData` causó un 404 — prohibido usarlo. Estilo visual: tipo Duolingo, consistente en TODO el catálogo (mismo estilo de personaje, paleta compatible con la marca).

### E5 — Imágenes NO se publican directo a producción en este proyecto
El pipeline actual publica automáticamente sin aprobación. Para una corrida de 500 lecciones eso es riesgo inaceptable: genera TODAS las imágenes a un directorio/bucket de **staging** con un manifest JSON (lección, paso, prompt usado, ruta). La promoción a producción es un paso separado y explícito. No modifiques el pipeline de producción existente sin autorización.

### E6 — Seguridad de datos
Nada de credenciales, secretos o datos de alumnos en el contenido generado, en seeds ni en logs. Los hashes son bcrypt/argon2 (ya hubo un incidente de contraseñas en texto plano — cero tolerancia). No toques modelos Prisma de Alumno/Pago en esta tarea.

### E7 — No inventes contenido pedagógico fuera de nivel
Cada lección declara su nivel CEFR. El vocabulario y la gramática deben corresponder al nivel (A1 no lleva subjuntivo pasado, C1 no repite "hello, my name is"). Valídalo con una checklist por nivel en el paso de QA.

---

## 📐 DISTRIBUCIÓN DE LAS 500 LECCIONES (AJUSTABLE — confirmar antes de Fase 1)

Matriz propuesta sobre los 7 tracks vocacionales y niveles A1–C1:

| Track | A1 | A2 | B1 | B2 | C1 | Total |
|---|---|---|---|---|---|---|
| General English | 30 | 30 | 30 | 25 | 15 | 130 |
| Restaurant | 15 | 15 | 15 | 10 | 5 | 60 |
| Call Center | 15 | 15 | 15 | 15 | 10 | 70 |
| Office English | 15 | 15 | 15 | 15 | 10 | 70 |
| Track 5 | 12 | 12 | 12 | 10 | 4 | 50 |
| Track 6 | 15 | 15 | 15 | 10 | 5 | 60 |
| Track 7 | 15 | 15 | 15 | 10 | 5 | 60 |
| **Total** | | | | | | **500** |

⚠️ Los nombres de los tracks 5–7 y la matriz exacta los confirma el Ingeniero en Fase 0. No asumas.

---

## 🔁 PROCESO EN 3 FASES ESTRICTAS (auditar → implementar → QA)

### FASE 0 — AUDITORÍA (obligatoria, sin escribir contenido todavía)
1. Lee el schema Prisma real de lecciones/pasos y los tipos Zod del LessonPlayer. **El código es la fuente de verdad, no este documento.** Si algo aquí contradice al código, detente y repórtalo.
2. Enumera los 6 tipos de paso con sus campos exactos.
3. Cuenta las lecciones que YA existen en la base. Las 500 son el total del catálogo: genera solo las faltantes. Nunca sobrescribas una lección existente.
4. Confirma con el Ingeniero: matriz de distribución, nombres de tracks, y convención de IDs/slugs.
5. Entrega un `PLAN_GENERACION.md` con todo lo anterior. **No pases a Fase 1 sin aprobación explícita.**

### FASE 1 — GENERACIÓN POR LOTES
- Lotes de **20 lecciones** máximo. Un lote = un archivo seed idempotente (`upsert` por slug único, nunca `create` ciego).
- Estructura de cada lección: título (EN + ES), nivel CEFR, track, objetivo pedagógico en una línea, 6–10 pasos usando SOLO los tipos existentes, vocabulario clave con audio Piper referenciado, imagen por lección vía E4/E5.
- Cada lote pasa validación Zod ANTES de tocar la base. Lote que no valida no se inserta — se corrige el generador.
- Al cerrar cada lote: commit con mensaje `feat(lecciones): lote NN — track X nivel Y (20)`, y actualización de `PROGRESO.md` (lotes hechos / pendientes / errores encontrados).
- Si un error nuevo aparece durante la corrida, **agrégalo a la sección REGLAS DE ORO de este archivo** antes de continuar. El documento crece con cada error, esa es su función.

### FASE 2 — QA
1. Script de verificación que recorra las 500: schema válido, nivel CEFR vs checklist de gramática, audio existente y verificado por bytes, imagen en staging con manifest, cero campos `distractors`, cero duplicados de slug.
2. Reporte `QA_REPORT.md`: totales por track/nivel, fallas encontradas, lecciones en cuarentena.
3. Muestra aleatoria de 10 lecciones renderizadas para revisión humana del Ingeniero antes de promover imágenes de staging a producción.

---

## ✅ AUTOEVALUACIÓN AL FINAL DE CADA LOTE

1. ¿Usé solo los 6 tipos de paso existentes? (E1)
2. ¿Cero `distractors` en todo el lote? (E2)
3. ¿Audio = Piper cacheado, verificado? (E3)
4. ¿Imágenes vía Interactions API, a staging, con manifest? (E4, E5)
5. ¿Seed idempotente, sin tocar lecciones existentes?
6. ¿El nivel CEFR del contenido corresponde al declarado? (E7)

Si cualquier respuesta es "no", el lote no se inserta.
