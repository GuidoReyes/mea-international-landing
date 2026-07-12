# PRD — Motor de lecciones interactivas (LessonPlayer) + pipeline de generación

## Contexto y adaptaciones obligatorias

Este PRD viene de un prompt externo que asume nombres en inglés (`Course`,
`Chapter`, `Lesson`, `isFree`, `score`, endpoints `/api/lessons/...`). El repo
de MEA ya tiene estos modelos construidos en **español** (decisión ya tomada y
confirmada por Guido en la Fase 1 de cursos online): `CursoOnline`, `Capitulo`,
`Leccion`, `esGratis`, rutas `/api/cursos-online`, `/api/lecciones/:id/completar`.
TODO este PRD debe usar esa nomenclatura existente — NO crear modelos ni rutas
en inglés duplicados.

Estado ya construido que hay que REUTILIZAR, no reemplazar:
- `backend/prisma/schema.prisma`: modelo `Leccion` (id, capituloId, titulo,
  slug, urlContenido, orden, esGratis, progreso).
- `POST /api/lecciones/:id/completar` (`backend/src/routes/lecciones.ts`):
  ya valida acceso (esGratis o suscripción activa), guarda `ProgresoLeccion`
  (completada, puntaje 0-100), y dispara el certificado automático vía
  `emitirCertificadoOnlineSiCorresponde` si el promedio del curso llega a 85.
  Extender este endpoint para aceptar el resultado del player, NO duplicarlo.
- `components/cursos-online/LeccionClient.tsx` y la página
  `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx`: hoy muestran
  video/audio/embed/link simple + botón "Marcar como completada" con puntaje
  manual. Debe seguir funcionando así para lecciones SIN contenido interactivo
  (`leccion.content` null) — es el fallback. Cuando `leccion.content` SÍ existe,
  renderizar el nuevo `LessonPlayer` en su lugar dentro de la misma página.
- `backend/src/lib/certificado-pdf.ts`: ya tiene `getS3Client()` apuntando a
  Cloudflare R2. Generalizar la subida de archivos (no solo PDFs) a un helper
  compartido en `backend/src/lib/storage.ts` (`subirArchivoR2(key, buffer,
  contentType)`) y usarlo tanto para certificados como para los audios de
  lecciones — no duplicar el cliente S3.
- Zod ya es dependencia del backend (`zod` v4) — no instalar de nuevo.

Decisiones ya tomadas con Guido para este PRD:
- **TTS**: mismo motor que usa el proyecto hermano `jarvis-gt`
  (`/Users/guidoreyes/Developer/jarvis-gt/panel/tts.py`): **Piper**, síntesis
  neuronal 100% offline, sin API key, modelos `.onnx` locales. jarvis-gt solo
  tiene voces en español instaladas; las lecciones son en inglés, así que hay
  que sumar una voz Piper en inglés de calidad equivalente (ej.
  `en_US-lessac-medium`, voz neutra US muy usada, con licencia libre — usar
  esa salvo que Guido pida otra). Implementar vía el **binario CLI de Piper**
  (no el paquete Python) para no meter un runtime Python en el contenedor
  Node/Railway: descargar el binario + modelo `.onnx` en el `Dockerfile`,
  invocar desde Node con `child_process.execFile`, texto por stdin, WAV por
  stdout. Subir el WAV resultante a R2 con el helper `subirArchivoR2`.
- **R2**: Guido va a agregar `CLOUDFLARE_R2_ACCOUNT_ID`,
  `CLOUDFLARE_R2_ACCESS_KEY` y `CLOUDFLARE_R2_SECRET_KEY` en Railway (ya
  existen `CLOUDFLARE_R2_BUCKET` y `CLOUDFLARE_R2_PUBLIC_URL`). El código debe
  asumir que van a estar disponibles; mientras tanto debe seguir funcionando
  en modo degradado (igual que hoy: certificado sin `urlPdf`, lección sin
  `audioUrl`) sin romper nada.

## FASE A — Contrato de datos de la lección

`backend/src/types/leccion-contenido.ts`:
```typescript
export type PasoLeccion =
  | { type: "intro"; title: string; body: string }
  | { type: "listen_learn"; phraseEn: string; phraseEs: string; audioUrl: string }
  | { type: "multiple_choice"; audioUrl?: string; question: string;
      options: string[]; correctIndex: number; feedback: string }
  | { type: "arrange_words"; phraseEs: string; words: string[];
      correctOrder: number[]; feedback: string }
  | { type: "fill_blank"; sentenceParts: [string, string];
      options: string[]; correctIndex: number; feedback: string }
  | { type: "write_word"; promptEs: string; correctWord: string;
      hintLetters: string[]; feedback: string };

export interface LeccionContenido {
  version: 1;
  steps: PasoLeccion[];
}
```

`backend/src/schemas/leccion-contenido.schema.ts`: un schema Zod por tipo de
paso + `z.discriminatedUnion("type", [...])`. Exportar `leccionContenidoSchema`
y `type LeccionContenidoInput = z.infer<typeof leccionContenidoSchema>`.

Prisma: agregar `content Json?` al modelo `Leccion` existente (no crear modelo
nuevo). Push aditivo a Railway igual que las migraciones anteriores.

## FASE B — Backend (Express + TS)

1. `POST /api/admin/lecciones/:id/content` — solo admin (`verifyJWT`), valida
   el body con `leccionContenidoSchema.safeParse`, si falla responde 400 con
   los errores de Zod, si pasa hace `prisma.leccion.update({ data: { content } })`.
2. `GET /api/lecciones/:id/jugar` — devuelve `content` si la lección es
   accesible (esGratis o suscripción activa, mismo criterio que ya existe en
   `cursos-online.ts`); si no, 403 con `{ error, upgradeUrl: "/planes" }`.
3. Extender `POST /api/lecciones/:id/completar` (ya existe): aceptar
   `puntaje` calculado en el cliente como antes (no cambia el contrato),
   simplemente el LessonPlayer va a ser quien calcule y envíe ese puntaje al
   terminar todos los pasos, en vez de que el alumno lo escriba a mano.

## FASE C — Frontend: LessonPlayer

En la página existente `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx` /
`LeccionClient.tsx`: si `leccion.content` existe, renderizar
`components/cursos-online/LessonPlayer.tsx` en vez del viewer simple actual.
Si no existe, seguir usando el viewer simple ya construido (no romperlo).

`LessonPlayer`:
- Estado: `currentStepIndex`, `respuestas[]`, `erroresPorPaso[]`.
- Barra de progreso arriba (`(currentStepIndex / totalSteps) * 100`), botón X
  que vuelve a `/cursos/[slug]`, botón Continuar abajo.
- Un componente por paso: `IntroStep`, `ListenLearnStep`, `MultipleChoiceStep`,
  `ArrangeWordsStep`, `FillBlankStep`, `WriteWordStep` — todos dentro de
  `components/cursos-online/lesson-steps/`.
- Feedback inmediato tras cada respuesta (banner verde si correcto con
  traducción, reintento "Start over" si incorrecto), nunca avanza sin
  feedback.
- Audio: `<audio>` con botones 1X y lenta (`playbackRate = 0.65`).
- Al terminar: pantalla de cierre con score (% de pasos correctos al primer
  intento), llama a `alumnoApi.completarLeccion(leccionId, puntaje)` (ya
  existe en `lib/alumno-api.ts`), botón "Siguiente lección".
- Colores de marca MEA ya usados en el resto del sitio: `#0A2540` (primario),
  `#00C4B4` (acento) — NO usar los colores `#1F3D61`/`#D96371` del prompt
  original, que no son la paleta real de MEA (ver `app/globals.css`).

## FASE D — Pipeline de generación (`backend/scripts/generate-leccion.ts`)

```bash
npx ts-node scripts/generate-leccion.ts \
  --curso "ingles-talleres-mecanicos" \
  --capitulo "Diálogos del taller" \
  --tema "Recibir al cliente en el taller" \
  --nivel "A1" \
  --frases "Good morning|Buenos días;What's the problem?|¿Cuál es el problema?;The engine|El motor;Check|Revisar"
```

1. Llama a la API de Anthropic (modelo Sonnet, `ANTHROPIC_API_KEY` ya está en
   Railway) exigiendo SOLO JSON válido de `LeccionContenido`, con las reglas
   pedagógicas: por frase meta → `listen_learn` + reconocimiento
   (`multiple_choice`/`fill_blank`) + producción (`arrange_words`/`write_word`);
   cada 2 frases → `listen_learn` combinador + ejercicio; 15-18 pasos máx;
   feedback positivo variado en español neutro (público guatemalteco); el
   diálogo completo debe ser funcional (taller/oficina/vida diaria).
2. Valida con `leccionContenidoSchema`. Si falla, reintenta 1 vez pidiendo
   corrección del error puntual de Zod. Si vuelve a fallar, aborta con error
   claro (no guarda nada a medias).
3. Para cada paso con `audioUrl` pendiente (`listen_learn`, `multiple_choice`
   con audio): sintetiza el WAV con el binario Piper (voz inglesa
   `en_US-lessac-medium`) vía `child_process.execFile`, sube a R2 con
   `subirArchivoR2`, reemplaza el placeholder por la URL pública. Si R2 no
   está configurado (credenciales faltantes), guardar el paso igual con
   `audioUrl: ""` y loguear un warning — NO abortar la generación completa.
4. Crea/actualiza en Prisma: si el `Capitulo` con ese título no existe dentro
   del `CursoOnline`, lo crea (orden = siguiente disponible); crea la
   `Leccion` (upsert por slug) con el `content` generado.

## FASE E — Seed: "Inglés para Talleres Mecánicos" (el nicho sin Papora)

Usar el pipeline de la Fase D para generar un **nuevo capítulo** "Diálogos del
taller" (orden 3) dentro del curso `ingles-talleres-mecanicos` ya sembrado en
Fase 1 — NO reemplazar el contenido de los capítulos existentes ("Herramientas
y partes del vehículo", "Atención al cliente en el taller"), que ya tienen
lecciones simples sembradas y en uso.

3 lecciones nuevas, la primera con `esGratis: true`:
1. **"Recibir al cliente"**: Good morning / What's the problem? / My car
   makes a noise / Let me check.
2. **"Las partes básicas"**: engine, brakes, oil, battery, tire en frases
   útiles ("The battery is dead", "Check the oil").
3. **"Cotizar y despedir"**: It costs… / It will be ready tomorrow / Thank
   you, see you later.

## Criterios de aceptación

- [ ] `LessonPlayer` reproduce los 6 tipos de paso sin errores en el navegador.
- [ ] Una lección con JSON inválido es rechazada por Zod en
      `POST /api/admin/lecciones/:id/content` con mensaje claro.
- [ ] El puntaje se calcula en el cliente y persiste en `ProgresoLeccion` al
      terminar, reutilizando `POST /api/lecciones/:id/completar` sin cambiar
      su contrato externo.
- [ ] `generate-leccion.ts` produce una lección válida end-to-end con un solo
      comando, con audio si R2 está configurado o sin audio (degradado) si no.
- [ ] Las 3 lecciones seed de "Diálogos del taller" están en la DB y son
      jugables en `/cursos/ingles-talleres-mecanicos`.
- [ ] Las lecciones ya sembradas en Fase 1 (sin `content`) siguen mostrando el
      viewer simple existente sin errores — cero regresión.
- [ ] Nada del bot de WhatsApp, CRM, dashboard admin, ni las rutas de
      cohortes existentes se modifica ni se rompe.
