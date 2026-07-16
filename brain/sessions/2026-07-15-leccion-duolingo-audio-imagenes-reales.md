---
type: session
area: cursos
date: 2026-07-15
slug: leccion-duolingo-audio-imagenes-reales
title: "LessonPlayer rediseñado estilo Duolingo: audio corregido, ordenar arreglado, imágenes reales vía Pexels"
tags: [lessonplayer, duolingo, piper-tts, r2, pexels, zod, forwardref, ux, leccion-a1, generate-leccion, next-image]
status: active
related:
  - 2026-07-15-auditoria-flujo-conversion-precios-admin
  - 2026-05-13-admin-rediseniado-saas-planificado
sources:
  - repo:components/leccion-player/LessonPlayer.tsx
  - repo:components/leccion-player/pasos/PasoVocabularioView.tsx
  - repo:backend/src/scripts/generate-leccion.ts
  - repo:backend/src/lib/leccion-contenido.schema.ts
  - repo:next.config.ts
superseded_by: null
---

# LessonPlayer rediseñado estilo Duolingo: audio corregido, ordenar arreglado, imágenes reales vía Pexels

## Contexto

El usuario pidió generar la primera lección real (A1, lección 1) con el pipeline Claude+Piper+R2 ya existente, con la intención explícita de que esa lección sirviera de **molde** para las ~500 lecciones que se van a generar después ("primero la leccion 1 de a1 va a ser el ejemplo de como se deben de hacer todas las demas... vamos a mejorar esa leccion para que cuando hagamos las demas no tengamos esos problemas"). Al probarla en vivo aparecieron varios bugs encadenados (audio bloqueado por CSP, audio de un paso sonando en otro paso, un ejercicio de ordenar imposible de resolver) y finalmente un pedido de rediseño visual explícito: que la página se pareciera a la lección real de Duolingo, con la tarjeta de vocabulario funcionando como el botón mismo (sin un "Continuar" separado) y con imágenes reales ilustrando cada palabra.

## Decisiones

- **La tarjeta ES el botón, no un botón aparte**: vocabulario, opción múltiple, escuchar y emparejar se auto-verifican/avanzan con un tap directo en la tarjeta. Ordenar y completar-libre (sin opciones) necesitan que el usuario construya la respuesta en varios toques antes de poder verificar, así que exponen un `verificar()` imperativo (`forwardRef` + `useImperativeHandle`) que dispara una barra de acción inferior compartida — el resto de tipos nunca llega a esa barra.
- **El ejercicio "ordenar" no admite palabras señuelo**: el usuario rechazó explícitamente la opción de soportar señuelos (elegida en un `AskUserQuestion` posterior: "Sin señuelos, como lo acabamos de arreglar"). La regla se llevó al schema Zod (`.refine()` que exige que `ordenCorrecto` sea una permutación completa de `palabras`), no solo al prompt, porque a escala de ~500 lecciones un fix solo-en-prompt no es confiable.
- **Cotejo texto↔audio permanente**: después de subir cada audio a R2, se hace un `HEAD` y se compara `content-length` contra el buffer sintetizado localmente; si no coincide, el paso se guarda sin `audioUrl` en vez de guardar un audio incorrecto. Se volvió parte fija de `generarAudios()`, no un fix puntual — nació de diagnosticar un archivo real en R2 que decía "Hello" pero estaba asignado al paso de "Good evening".
- **Pexels sobre Unsplash** para las imágenes de vocabulario: Unsplash deprecó su API "Source" sin key. El pipeline de imágenes (`generarImagenes()`) sigue el mismo patrón de tolerancia a credenciales faltantes que ya se usaba para R2/Drive/Piper — sin `PEXELS_API_KEY` simplemente no hay imagen, nunca rompe la generación del resto de la lección.
- **La expansión de contenido (288 → 500 lecciones únicas, sin repetir lecciones de inglés general dentro de rutas vocacionales como restaurantes) queda deliberadamente diferida** hasta que el usuario apruebe esta lección como molde definitivo.

## Output

- Commits: `4fd5bbc` (fix: audio correspondía al paso equivocado — faltaba `key={paso.id}` + `BotonAudio` cacheaba el `Audio` para siempre), `4a39423` (fix CSP: `media-src` sin `https://*.r2.dev`, bloqueaba todo el audio), `47b4652` (fix: ordenar con palabras señuelo imposibles de verificar — Zod `.refine()` + retry-con-feedback en `generarContenido()`), `c9e5701` (rediseño Duolingo: barra de acción inferior unificada, tarjetas-botón, X de salir con confirmación), `17f146f` (tarjeta de vocabulario 100% clicable + imágenes reales vía Pexels).
- `components/leccion-player/LessonPlayer.tsx`: barra de acción `sticky bottom-4` compartida solo para `ordenar`/`completar` sin opciones; `pasoViewRef` (`useRef<PasoViewHandle>`); marcador de puntaje en vivo; modal de confirmación de salida (`rutaHref`).
- `components/leccion-player/pasos/`: `PasoVocabularioView.tsx` reescrito como `role="button"` de tarjeta completa (audio interno con `stopPropagation`); `PasoOrdenarView.tsx`/`PasoCompletarView.tsx` como `forwardRef`; `BotonAudio.tsx` recrea el objeto `Audio` cuando cambia la URL en vez de cachearlo; `types.ts` con `PasoViewHandle`.
- `backend/src/lib/leccion-contenido.schema.ts`: `pasoOrdenarSchema` con `.refine()` de permutación completa; `pasoVocabularioSchema` con `imagenBusqueda` opcional.
- `backend/src/scripts/generate-leccion.ts`: `MAX_INTENTOS_GENERACION = 2` (retry con el error de Zod inyectado en el prompt); cotejo de bytes en `generarAudios()`; `isPexelsConfigurado()` / `buscarImagenPexels()` / `generarImagenes()` nuevos, corridos después de `generarAudios()` en `main()`.
- `next.config.ts`: `media-src` con `https://*.r2.dev`; **bug latente encontrado y corregido de paso**: `images.remotePatterns` no existía (cualquier imagen externa real, no solo Pexels, habría roto en runtime) — se agregó `images.pexels.com`.
- `app/globals.css`: keyframes `shake`, `pop-correct`, `slide-up` para feedback visual de respuestas.

## Pendiente

- [ ] Agregar `PEXELS_API_KEY` a Railway (cuenta gratis en pexels.com/api) — sin esto el pipeline funciona pero ninguna tarjeta muestra imagen.
- [ ] No se pudo documentar `PEXELS_API_KEY` en `backend/.env.example` — un hook de permisos bloqueó incluso la **lectura** del archivo en esta sesión ("File is in a directory that is denied by your permission settings"). Pendiente que el usuario agregue la línea manualmente o ajuste el permiso.
- [ ] Regenerar la lección 1 de A1 una vez más con `PEXELS_API_KEY` activo, para revisión final del usuario como "lección molde" antes de escalar.
- [ ] Expansión de contenido: 288 → 500 lecciones únicas, sin repetición de lecciones de inglés general dentro de rutas vocacionales (restaurantes, talleres, oficina, técnicos-pc, call-center, viajar) — explícitamente diferida por el usuario hasta aprobar el molde.

## Cross-refs

- [[2026-07-15-auditoria-flujo-conversion-precios-admin]] — misma sesión; la política de "lecciones gratis por nivel" definida ahí alimenta directamente el contenido de lecciones de este nodo.
- [[2026-05-13-admin-rediseniado-saas-planificado]] — el roadmap SaaS original ya contemplaba certificados y portal alumno; el LessonPlayer es la pieza de contenido que faltaba materializar de ese plan.

## Fuentes

- `repo:components/leccion-player/LessonPlayer.tsx`
- `repo:components/leccion-player/pasos/PasoVocabularioView.tsx`
- `repo:components/leccion-player/pasos/BotonAudio.tsx`
- `repo:backend/src/scripts/generate-leccion.ts`
- `repo:backend/src/lib/leccion-contenido.schema.ts`
- `repo:next.config.ts`
