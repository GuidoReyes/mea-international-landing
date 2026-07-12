# PRD — Cursos Online Fases 2 y 3 (MEA International)

## Contexto

La Fase 1 ya está implementada y verificada: modelos Prisma (`CursoOnline`, `Capitulo`,
`Leccion`, `InscripcionOnline`, `ProgresoLeccion`, `CertificadoOnline`, `Plan`, `PlanPrecio`,
`Suscripcion`, `PagoSuscripcion` — todos con PK Int y FK a `Alumno`), rutas públicas
`GET /api/cursos-online[/:slug]` y `GET /api/planes`, seed, y páginas `/cursos`,
`/cursos/[slug]` y `/planes` con checkout manual por WhatsApp.

Convenciones obligatorias (ya establecidas en el repo):
- Backend: Express + TS en `backend/src/routes/*.ts`, Prisma singleton `lib/prisma.ts`,
  caché Redis tolerante a fallos (`lib/redis.ts`), JWT con `middleware/auth.middleware.ts`
  (solo admins hoy), rate limiting en `middleware/rate-limit.middleware.ts`, errores en español.
- Certificados por cohorte ya generan PDF con `pdfkit` + `qrcode` y suben a S3 en
  `routes/certificados.ts` (`generateCertificadoPdf`) — REUTILIZAR ese helper/patrón.
- Frontend: Next.js 16 App Router (params es Promise), Tailwind, colores #0A2540/#00C4B4,
  fetchers públicos en `lib/cursos-online.ts`, client admin en `lib/api.ts`.
- NO tocar: bot WhatsApp, CRM, dashboard admin, auth de Admin, modelos existentes.
- NO enlazar la landing (`app/page.tsx`) a /cursos ni /planes en estas fases.

## Fase 2 — Auth de alumno, progreso y certificados

### Autenticación de alumno
- Login JWT para `Alumno` (campos `password` bcrypt nullable y `primerLogin` ya existen):
  `POST /api/auth/alumno/login` (email + password) y `POST /api/auth/alumno/cambiar-password`
  para el flujo de primer login. Payload JWT separado del de Admin (p. ej. `{ alumnoId }`),
  middleware nuevo `verifyAlumnoJWT` + variante opcional `optionalAlumnoJWT` que no falla
  sin token. No modificar `verifyJWT` de admin. Rate limiting en login.
- Frontend: página `/alumno/login` y almacenamiento de token separado del admin
  (`mea_alumno_token`), helpers en un `lib/alumno-api.ts` nuevo.

### Inscripción y progreso
- `POST /api/cursos-online/:slug/inscribir` (auth alumno): crea `InscripcionOnline`
  idempotente (unique alumnoId+cursoOnlineId). Gratis, no requiere plan.
- `POST /api/lecciones/:id/completar` (auth alumno): body `{ puntaje?: number 0-100 }`,
  upsert de `ProgresoLeccion` con `completada=true`, `completadaEn=now`. Validar que la
  lección exista y que el alumno pueda accederla (esGratis o suscripción ACTIVA vigente).
- `GET /api/cursos-online/:slug` con `optionalAlumnoJWT`: si hay alumno, incluir progreso
  por lección (`completada`, `puntaje`) y porcentaje del curso; si tiene suscripción ACTIVA
  vigente (fechaFin futura), `bloqueada=false` y `urlContenido` visible en todas las lecciones.
  Cuidado con la caché Redis: cachear solo la variante anónima.
- `GET /api/suscripciones/me` (auth alumno): estado de la suscripción actual.

### Certificados online
- Al completar una lección, si TODAS las lecciones del curso están completadas y el
  promedio de `puntaje` es >= 85, crear `CertificadoOnline` (unique alumnoId+cursoOnlineId,
  idempotente) con código QR de verificación reutilizando el patrón de
  `routes/certificados.ts` (pdfkit + S3 + `urlPdf`).
- `GET /api/certificados-online/:cursoOnlineId` (auth alumno): devuelve/descarga el
  certificado si existe.

### Frontend Fase 2
- `/mis-cursos`: requiere sesión de alumno; lista `InscripcionOnline` con barra de
  progreso real y link al certificado si existe.
- `/cursos/[slug]`: mostrar progreso real y estados completed/unlocked/locked por lección
  cuando hay sesión; botón "Inscribirme gratis" si no está inscrito.
- Página de lección `/cursos/[slug]/leccion/[leccionSlug]`: muestra `urlContenido`
  (video/audio/markdown) si está desbloqueada, botón "Marcar como completada" con puntaje
  opcional; candado + CTA a /planes si está bloqueada.
- Conectar la barra de progreso del catálogo `/cursos` (hoy fija en 0%) al progreso real
  si hay sesión.

## Fase 3 — Pagos automáticos con Recurrente

- Config: `RECURRENTE_API_KEY`, `RECURRENTE_WEBHOOK_SECRET` desde env (Railway). Si faltan,
  los endpoints de checkout responden 503 con mensaje claro y el flujo manual_whatsapp
  sigue funcionando (fallback permanente).
- `POST /api/suscripciones/checkout` (auth alumno, rate limited): body `{ planPrecioId }`;
  crea `Suscripcion` estado PENDIENTE proveedor "recurrente" y llama a la API de Recurrente
  para crear el checkout; responde `{ checkoutUrl }`.
- `POST /api/webhooks/recurrente`: validar firma HMAC con `RECURRENTE_WEBHOOK_SECRET`
  usando el `rawBody` que index.ts ya captura (patrón de `hmac.middleware.ts`); en pago
  exitoso marcar `Suscripcion` ACTIVA (fechaInicio=now, fechaFin=now+duracionMeses),
  crear `PagoSuscripcion` COMPLETADO, y enviar confirmación por WhatsApp reutilizando
  `lib/whatsapp-send.ts` si el alumno tiene número. Idempotente por `idExterno`.
- Frontend `/checkout/[planPrecioId]`: resumen del plan+duración; si hay sesión llama al
  checkout y redirige a `checkoutUrl`; si Recurrente no está configurado o no hay sesión,
  mostrar el CTA de WhatsApp actual como fallback.
- Tests mínimos: unit del cálculo de fechaFin y de la validación de firma del webhook.

## Criterios de aceptación
- Alumno puede iniciar sesión, inscribirse gratis, completar lecciones y ver su progreso.
- Certificado se emite automáticamente solo con promedio >= 85 y curso 100% completado.
- Suscripción ACTIVA desbloquea todas las lecciones; vencida (fechaFin pasada) no.
- Webhook de Recurrente rechaza firmas inválidas y es idempotente ante reintentos.
- Nada del sistema existente (bot, CRM, admin, cohortes) se modifica ni se rompe.
- La landing NO enlaza aún a las páginas nuevas.
