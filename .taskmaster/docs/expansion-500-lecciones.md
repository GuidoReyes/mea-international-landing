# PRD — Expansión del catálogo a 500 lecciones

## Contexto

La plataforma tenía 241 lecciones (registros `Leccion` en la base de datos),
pero solo 4 tenían contenido interactivo real (LessonPlayer: 7 tipos de
paso, audio Piper, imágenes fotorrealistas IA). El resto son placeholders
de currículo (título/slug/orden) sin `content`.

De las 7 rutas visibles en `/cursos` (`general`, `viajar`, `restaurantes`,
`talleres`, `oficina`, `tecnicos-pc`, `call-center`), solo 3 tenían
lecciones propias (`general`: 228, `talleres`: 7, `oficina`: 6). Las otras
4 rutas (`viajar`, `restaurantes`, `tecnicos-pc`, `call-center`) no tenían
ninguna lección propia — mostraban contenido prestado de "general" vía
`RutaLeccion` (ver `seed-curriculum.ts`, matriz `TRACK_CHAPTERS`), lo cual
viola el requisito de que ningún curso repita el contenido de otro.

**Corrección de aritmética**: el pedido original decía "272 lecciones
faltantes" para llegar a 500; el cálculo real es **500 − 241 = 259**. Se
usa 259 en todo este documento — divide exacto entre los 7 cursos (37 cada
uno), lo cual da counts limpios por nivel dentro de cada curso.

## Objetivo

Llegar a **500 lecciones totales**, agregando **259 lecciones nuevas: 37
por cada uno de los 7 cursos**, ninguna duplicada temáticamente con
ninguna otra lección de la plataforma (ni siquiera entre cursos que
comparten escenario, ej. "restaurante" en general vs. restaurantes).

## Estado de partida (antes de este PRD)

| Curso | Ruta | Lecciones hoy | Niveles con contenido |
|---|---|---|---|
| Inglés General | `general` | 228 | A1(86) A2(49) B1(40) B2(32) C1(34) |
| Inglés para Talleres Mecánicos | `talleres` | 7 | A1(7) |
| Inglés de Oficina | `oficina` | 6 | A1(6) |
| Inglés para Viajar | `viajar` | 0 | — |
| Inglés para Restaurantes | `restaurantes` | 0 | — |
| Inglés para Técnicos en Computación | `tecnicos-pc` | 0 | — |
| Inglés para Call Center | `call-center` | 0 | — |

## Reglas de no-duplicación

1. **Ningún tema se repite en dos cursos.** Cuando un curso vocacional
   comparte escenario con "general" (ej. restaurantes/comida, viajar/hotel),
   el curso vocacional adopta el **ángulo del profesional/trabajador**,
   nunca el del cliente/turista genérico que ya cubre "general":
   - `restaurantes` = perspectiva del **mesero/staff** (tomar pedidos,
     servir, manejar quejas) — nunca "cómo pedir en un restaurante" (eso
     ya existe en `general`, capítulo "At the Restaurant").
   - `viajar` = perspectiva del **turista en tránsito** (aeropuerto, taxi,
     hotel, emergencias) — vocabulario distinto al "At the Hotel" genérico
     de `general` (ese es un huésped cualquiera; acá es específicamente
     alguien de viaje resolviendo logística).
2. Un mismo nivel (ej. A1) en dos cursos distintos nunca comparte título ni
   tema de capítulo — verificado manualmente contra el roster completo en
   `backend/src/scripts/seed-curriculum-500.ts` antes de sembrar.
3. Las 259 lecciones nuevas quedan como **placeholders** (`Leccion.content =
   null`) hasta que su tarea de Task Master correspondiente las genere.

## Distribución (37 lecciones nuevas × 7 cursos = 259)

| Curso | Niveles nuevos/reforzados | Desglose |
|---|---|---|
| Inglés General | A1-C1 (ya completo, se refuerza) | A1+8, A2+7, B1+8, B2+7, C1+7 |
| Talleres Mecánicos | A1 (refuerzo) + A2 (nuevo) | A1+15, A2+22 |
| Oficina | A1 (refuerzo) + A2 (nuevo) + B1 (nuevo) | A1+8, A2+15, B1+14 |
| Viajar (curso nuevo) | A1 + A2 | A1+19, A2+18 |
| Restaurantes (curso nuevo) | A1 + A2 | A1+19, A2+18 |
| Técnicos en Computación (curso nuevo) | A2 + B1 | A2+19, B1+18 |
| Call Center (curso nuevo) | B2 + C1 | B2+19, C1+18 |

Roster completo (títulos exactos de cada capítulo y lección) en
`backend/src/scripts/seed-curriculum-500.ts` — es la fuente de verdad,
este documento no lo retranscribe para evitar que ambos se desincronicen.

## Estándar de calidad — la lección 1 de A1 como molde

Toda lección nueva debe seguir exactamente el mismo estándar ya validado
en la Lección #1 ("Saludos básicos y despedidas", A1 general), adaptando
el **tema** al de cada lección nueva pero sin desviarse de la estructura:

- **7 tipos de paso disponibles**: vocabulario, opción múltiple, completar,
  ordenar, emparejar, escuchar, y opcionalmente 1-2 `speak-check` que
  reusen una palabra ya introducida antes en la misma lección (nunca
  contenido nuevo).
- **Imágenes**: fotorrealistas, generadas con Gemini (`gemini-3.1-flash-image`
  vía Interactions API), persona 100% ficticia/sintética — nunca una
  persona real identificable. Cacheadas por concepto en R2
  (`imagenes/vocabulario/`), reusadas automáticamente si ya existen.
- **Audio**: Piper TTS pre-generado y subido a R2, verificado por bytes
  (cotejo `content-length`) antes de guardarse — un paso sin audio
  verificado se guarda SIN `audioUrl` en vez de arriesgar un audio
  incorrecto.
- **Ejercicio "ordenar"**: `palabras` contiene ÚNICAMENTE las piezas de la
  frase correcta (sin señuelos/distractores) y `ordenCorrecto` debe ser una
  permutación completa — esto está impuesto por un `.refine()` de Zod en
  `leccion-contenido.schema.ts`, no solo por el prompt. **No tocar ese
  refine ni reintroducir señuelos.**
- **UI**: tarjeta-botón (sin "Continuar" separado en vocabulario/opción
  múltiple/emparejar/escuchar), barra de acción inferior solo para
  ordenar/completar-texto-libre, colores de marca MEA.

## Errores ya cometidos que NO se deben repetir

Documentados y corregidos en sesiones anteriores — la generación en masa
de 259 lecciones reutiliza el mismo pipeline (`generate-leccion.ts`), así
que estas correcciones ya están activas por defecto:

1. **Audio de un paso sonando en otro paso** — causado por falta de
   `key={paso.id}` en el render + un componente de audio que cacheaba el
   objeto `Audio` indefinidamente. Corregido en `LessonPlayer.tsx` y
   `BotonAudio.tsx`; no relevante para el pipeline de generación en sí,
   pero confirma por qué el cotejo de audio existe.
2. **Ejercicio "ordenar" con palabras señuelo imposibles de verificar** —
   corregido con el `.refine()` de Zod + regla explícita en el prompt de
   `generate-leccion.ts` + retry-con-feedback si Claude lo viola.
3. **Imágenes/audio mal cacheados tras cambiar de estilo** — la key de R2
   no cambia al regenerar, así que un cache-hit puede servir bytes viejos.
   Irrelevante para lecciones nuevas (nunca existieron antes), pero si se
   regenera algo ya creado, usar `--forzar` (que ya agrega cache-busting
   `?v=` automáticamente).
4. **Modelo de imagen retirado sin aviso** — `imagen-4.0-generate-001` dejó
   de estar disponible; el pipeline ya migró a la Interactions API con
   `gemini-3.1-flash-image`, configurable por `GEMINI_IMAGE_MODEL` si
   Google retira este modelo también.
5. **Contenido vocacional duplicado con general** — la causa raíz de este
   PRD. Cada lección nueva de un curso vocacional debe verificarse contra
   el roster de "general" antes de aprobarse (ya resuelto en el diseño del
   roster, ver regla de no-duplicación arriba).

## Plan de ejecución

1. **Seed de currículo** (`backend/src/scripts/seed-curriculum-500.ts`):
   crea los 4 `CursoOnline` nuevos (viajar, restaurantes, tecnicos-pc,
   call-center), los `Capitulo` nuevos en los 7 cursos, y las 259 `Leccion`
   placeholder (`content: null`), vinculadas a su `Ruta` vía `RutaLeccion`.
   Idempotente — correrlo de nuevo no duplica nada.
2. **259 tareas de Task Master**, una por lección, IDs consecutivos
   empezando después de la 163 existente. **Orden: agrupadas por nivel
   (A1 → A2 → B1 → B2 → C1), no por curso** — así se completa A1 en toda
   la plataforma antes de avanzar a A2, tal como pidió el usuario
   ("empezando por el nivel A1, de ahí en orden").
3. Cada tarea de Task Master ejecuta, para su `Leccion.id` específico:
   ```bash
   PIPER_VOICE_PATH=<path> railway run npm run generate:leccion -- <leccionId> "<tema>"
   ```
   donde `<tema>` es el título de la lección (ej. "Vocabulario de platillos
   comunes"), y el contexto del curso/rol (general vs. staff de
   restaurante, etc.) va en la tarea para que quien la ejecute sepa el
   ángulo correcto si el título por sí solo es ambiguo.
4. QA por lección: verificar en el resumen del script que audios e
   imágenes se generaron (no saltados), y — para una muestra, no las 259 —
   revisar visualmente en `/cursos/{ruta}/leccion/{slug}`.
5. **Ejecución real**: dado el volumen (259 llamadas a Claude + Piper +
   Gemini, cada una con verificación/reintento), se recomienda usar el
   orquestador `/parallel` de este proyecto (5 ventanas, dependency-aware)
   sobre las tareas `pending` de Task Master, o continuar la ejecución
   secuencial entre sesiones. No es una operación de un solo turno.

## Criterios de aceptación

- [ ] `SELECT COUNT(*) FROM Leccion` = 500.
- [ ] Cada uno de los 7 cursos tiene exactamente 37 lecciones más que al
      empezar este PRD.
- [ ] Ningún título de capítulo/lección se repite entre dos cursos
      distintos (verificado en el roster antes del seed).
- [ ] Las 259 tareas de Task Master existen, en orden A1→C1, cada una
      referenciando un `Leccion.id` real.
- [ ] Cada lección generada pasa el mismo estándar de calidad que la
      Lección #1: 7 tipos de paso disponibles, imágenes fotorrealistas
      IA cacheadas, audio Piper verificado por bytes, sin señuelos en
      "ordenar".
