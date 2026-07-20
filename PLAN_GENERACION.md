# PLAN_GENERACION.md — Fase 0 (auditoría) del PRD maestro de 500 lecciones

> Fuente: `.taskmaster/docs/mea-500-lecciones-maestro.md`. Por su propia regla
> ("No pases a Fase 1 sin aprobación explícita"), este documento se detiene
> acá y espera confirmación — no se generó contenido nuevo.

## 1. El código como fuente de verdad — divergencias encontradas

El prompt maestro describe un estado de partida que **ya no coincide** con lo
que existe en el repo, porque en la sesión anterior ya se ejecutó una fase 0→1
completa de un PRD hermano (`expansion-500-lecciones.md`). Divergencias
concretas:

| Afirmación del prompt maestro | Realidad en el código/BD |
|---|---|
| "LessonPlayer con **6** tipos de paso" | Son **7**: se agregó `speak-check` (reconocimiento de voz) esta sesión. |
| "Genera solo las faltantes" (implica partir de <500) | La BD **ya tiene 500 lecciones** (241 originales + 259 nuevas ya sembradas como placeholders). |
| Matriz propuesta: General 130 / Restaurant 60 / Call Center 70 / Office 70 / Track5 50 / Track6 60 / Track7 60 | Matriz **ya sembrada y en producción**: 37 lecciones nuevas por cada uno de los 7 cursos (General 265, Talleres 44, Oficina 43, Viajar 37, Restaurantes 37, Técnicos-PC 37, Call Center 37 = 500). |
| E5: imágenes a staging + manifest, promoción manual separada | El pipeline de imágenes (`gemini-image.ts` + `imagen-vocabulario.ts`) **ya publica directo a producción** (R2), sin staging. Ya se usó así, en producción, para 3 lecciones validadas + la librería de imágenes reusable. |
| Lotes de 20, seed idempotente por `upsert`-por-slug | El enfoque ya implementado es **una tarea de Task Master por lección individual** (no lotes de 20 en un seed), referenciando `Leccion.id` específicos ya creados por `seed-curriculum-500.ts`. |

## 2. Tipos de paso (7, con campos exactos)

Fuente: `backend/src/lib/leccion-contenido.schema.ts` (Zod, source of truth),
espejado sin validación en `lib/leccion-contenido.ts` (frontend).

1. **vocabulario** — `palabra, traduccion, imagenUrl?, imagenBusqueda?, audioUrl?`
2. **opcion_multiple** — `pregunta, opciones[2-6], respuestaCorrecta`
3. **completar** — `textoAntes, textoDespues, respuestaCorrecta, opciones?[2-6]`
4. **ordenar** — `instruccion, palabras[≥2], ordenCorrecto[], fraseCorrecta` — **dos** `.refine()` de Zod: (a) `ordenCorrecto` debe ser permutación completa de `palabras` sin señuelos (E1/E2 ya cumplidos), (b) NUEVO esta sesión: la frase reconstruida con `ordenCorrecto` debe coincidir exactamente con `fraseCorrecta` (bug real encontrado: una lección pasaba el refine (a) pero armaba "How are party in your many?" — inglés roto). **No tocar ninguno de los dos refine.**
5. **emparejar** — `instruccion, pares[{izquierda,derecha}], ≥2`
6. **escuchar** — `audioUrl (requerido), opciones[2-6], respuestaCorrecta`
7. **speak-check** — `target, lang?, imagenUrl?` — reconocimiento de voz (Web Speech API), reusa `target` de un `vocabulario`/`escuchar` ya introducido antes en la misma lección, nunca contenido nuevo.

## 3. Conteo real de lecciones (BD de producción, Railway)

- **Total: 500** (verificado por conteo directo, no estimado).
- **Con contenido interactivo generado y validado: 3** (`Leccion.id` 249, 397, 360 — una de General, una de Restaurantes, una de Viajar, cada una con audio Piper verificado por bytes, imágenes fotorrealistas de personas ficticias, y el fix de `fraseCorrecta` aplicado).
- **256 pendientes**: ya tienen fila en la BD (`content: null`) y una tarea de Task Master 1:1 ya creada (IDs 164-422, `.taskmaster/tasks/tasks.json`), ordenadas A1→A2→B1→B2→C1 en toda la plataforma.
- Sin duplicados de slug (verificado por el propio `seed-curriculum-500.ts`, que hace `findFirst` antes de crear).
- Ningún curso vocacional repite tema con "General": los cursos vocacionales usan el ángulo del profesional (mesero, no comensal; turista en tránsito, no huésped genérico) — confirmado en la lección de Restaurantes ya generada (imágenes de mesero/anfitrión atendiendo mesas, cero solapamiento con el capítulo "At the Restaurant" de General).

## 4. Puntos que requieren tu confirmación explícita antes de Fase 1

### 4.1 — ¿Mantener la matriz ya sembrada, o rehacerla para calzar con la nueva?

**Recomendación: mantener la ya sembrada (37 por curso).** Rehacerla implicaría
borrar/reorganizar 259 filas ya creadas, 259 tareas de Task Master ya
generadas (con IDs ya referenciados), y volver a decidir de cero qué lecciones
sobran o faltan por curso — sin ganancia real, ya que ambas matrices suman
500 y ya se verificó que la actual no duplica contenido entre cursos.

### 4.2 — ¿Implementar staging + manifest + promoción manual para imágenes (E5)?

**Recomendación: no, por ahora.** El pipeline actual (publicación directa a
R2, con librería cacheada por concepto) ya generó ~20 imágenes reales en
producción sin ningún incidente, y ya está referenciado como el mecanismo
oficial en el PRD hermano y en las 259 tareas de Task Master. Construir un
sistema de staging + manifest + paso de aprobación manual es una tarea grande
aparte (nuevo bucket o prefijo, tabla de estado, ruta admin, UI de
aprobación) — si la querés, es un PRD propio, no algo que deba bloquear la
generación de las 256 lecciones que ya están en cola.

### 4.3 — Nombres de tracks 5/6/7

Mapeo propuesto (a confirmar): Track 5 = **Talleres Mecánicos**, Track 6 =
**Viajar**, Track 7 = **Técnicos en Computación** — es una asignación mía
para que la matriz nueva "cierre", pero como ya se decidió mantener la matriz
vieja (4.1), este punto queda sin efecto práctico salvo que me digas lo
contrario.

## 5. Actualización a las Reglas de Oro (regla nueva encontrada esta sesión)

Por instrucción del propio documento ("si un error nuevo aparece... agrégalo
a la sección Reglas de Oro"): agregar **E8 — la permutación de "ordenar" debe
reconstruir una frase con sentido, no solo ser estructuralmente válida** (ver
punto 2, tipo "ordenar" — ya implementado como `fraseCorrecta` + segundo
`.refine()`, commit `2dd9208`).

## Siguiente paso

Esperando tu confirmación sobre 4.1 y 4.2. Si confirmás "mantener lo ya
construido" en ambos, Fase 1 es simplemente: seguir ejecutando las 256 tareas
`pending` de Task Master (164-422) — no hace falta código nuevo, el
generador y el schema ya están al día con E1-E4, E7 y el fix de E8.
