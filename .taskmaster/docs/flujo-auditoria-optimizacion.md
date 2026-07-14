# PRD — Auditoría y Optimización del Flujo de mea.edu.gt

## 0. Adaptaciones al repo real (el prompt fue escrito para un stack genérico)

| Prompt original | Realidad del repo | Decisión |
|---|---|---|
| Colores navy #1F3D61 / rojo #D96371 | Marca real: navy **#0A2540** / teal **#00C4B4** (corregido en todas las fases previas) | Usar los colores reales |
| Modelo `User` con `String @id @default(cuid())` | Existe `Alumno` (Int autoincrement) con auth completa: bcrypt, JWT (`verifyAlumnoJWT`), login, cambiar-password | Extender `Alumno`, NO crear `User` |
| "Verifica si existe `Lesson`/`isFree`" | Ya existe `Leccion.esGratis` y sistema de `Ruta`/`RutaLeccion` con 7 rutas sembradas | Reusar; solo falta marcar esGratis en las primeras 3 de cada ruta |
| Rutas vocacionales: General, Restaurantes, Call Center, Oficina | Las 4 YA EXISTEN como Rutas publicadas (+ Viajar, Talleres, Técnicos PC) en `/cursos/[slug]` | Solo falta mostrarlas en la landing |
| "Registro con OTP por WhatsApp reutilizando el bot" | `sendWhatsAppMessage()` ya existe en `backend/src/lib/whatsapp-send.ts` (Meta Cloud API) | Reusar para enviar el OTP |
| Admin nunca expone contraseñas (2.6) | Ya se cumple: bcrypt en Alumno, admin con cookie httpOnly (PR #2); `createAlumno` ya genera tempPassword | Verificar y agregar botón "Resetear contraseña" en la ficha si falta |

## FASE 1 — Auditoría (SOLO diagnóstico, entregable FLOW_AUDIT.md, sin código)

Ejecutada por el orquestador antes de crear estas tareas. Ver `/FLOW_AUDIT.md`.
Hallazgos top: (1) los 3 botones de la sección Features (Feature108) no tienen acción
(dead buttons); (2) no existe auto-registro de alumnos (el funnel lecciones-gratis→cuenta
no puede cerrar); (3) `/planes` no soporta `?nivel=`; (4) solo 5 lecciones son gratis y
concentradas en 3 rutas — 4 rutas tienen cero gratis; (5) sin sitemap/robots (SEO);
(6) link muerto `href="#"` a Política de Privacidad dentro del modal de cookies.

**GATE: la Fase 2 NO se implementa hasta confirmación explícita del usuario.**

## FASE 2 — Implementación (tras aprobación; ejecutar con /parallel)

### 2.1 Sección "Elige tu nivel de inglés" (landing #cursos)
Reemplazar las 3 tarjetas de nivel actuales (Pre A / B1 B2 / VIP, EvervaultCard) por 5
tarjetas compactas A1-C1 con el copy de la tabla del prompt (Principiante/Elemental/
Intermedio/Intermedio alto/Avanzado). CTA "Empezar en [Nivel]" → `/planes?nivel=A1..C1`.
- `/planes` (page + PricingPlanes) lee `searchParams.nivel` y lo persiste (query param al
  checkout o preselección visual + se pasa al mensaje de WhatsApp del fallback).
- Datos de las 5 tarjetas en `content/site.json` (clave nueva `niveles[]`) para mantener
  el mecanismo editable de JARVIS. Actualizar `_doc`.
- Mobile: grid 1 col con scroll natural (o carrusel horizontal simple); desktop: 5 cols.
- Colores reales #0A2540/#00C4B4, estilo pill existente.

### 2.2 Botones muertos de Features ("Alumnos")
`components/ui/shadcnblocks-com-feature108.tsx`: los 3 `<Button>` no navegan.
- "Inscríbete Ahora" (×2) → `/planes` (Link).
- "Ver Testimonios" → `#testimonios`.
También arreglar el `href="#"` de Política de Privacidad en el modal de cookies de
`app/page.tsx` (abrir el LegalModal de privacidad o quitar el link).

### 2.3 Sección "Cursos" vocacionales en la landing
Nueva sección (o reemplazo del bloque actual de EvervaultCards, a definir en diseño)
con 4 tarjetas: Inglés General, Restaurantes, Call Center, Oficina — CTA
**"Ver 3 lecciones gratis"** → `/cursos/general|restaurantes|call-center|oficina`.
Datos desde `getRutas()` existente (lib/rutas.ts) o estático con los slugs reales.

### 2.4 Lecciones gratis sin login + muro en la 4a
- **Datos**: script/actualización para marcar `esGratis: true` en las primeras 3
  lecciones (orden en `RutaLeccion`) de CADA una de las 7 rutas. Idempotente.
- **Verificar** que `/cursos/[slug]/leccion/[slug]` ya renderiza lecciones gratis sin
  sesión (el gating actual usa `esGratis`/suscripción en `LeccionClient`); ajustar si no.
- **LessonGate**: en la lección 4+ sin sesión, en vez de la pantalla de bloqueo actual,
  modal de registro (`RegisterModal`) con copy "Desbloqueá el resto de la ruta creando
  tu cuenta gratis".
- **SEO**: crear `app/sitemap.ts` (home, /cursos, rutas, lecciones gratis, /planes,
  /clases-en-vivo) y `app/robots.ts`. Metadata por lección gratis.

### 2.5 Registro self-service dual (email o teléfono+OTP)
Cambios en `Alumno` (schema.prisma) — patrón Int id se mantiene:
- `email String? @unique` (pasa a opcional), `whatsapp String? @unique` (se vuelve unique),
  `password` ya es opcional. Regla de aplicación: al menos uno de email/whatsapp.
  Migración segura: verificar duplicados de whatsapp existentes antes del db push.
- Modelo nuevo `OtpCode { id, whatsapp, codigo (hash), expiraEn, usado, creadoEn }` con
  rate-limit por número.
Backend (`routes/auth-alumno.ts`):
- `POST /registro` (email+password, bcrypt, carnet autogenerado ej. WEB-0001).
- `POST /otp/solicitar` (genera código 6 dígitos, hash en DB, envía por
  `sendWhatsAppMessage`, expira 10 min, máx 3/hora por número).
- `POST /otp/verificar` (valida código → crea/loguea Alumno solo-teléfono, JWT normal).
Frontend: `RegisterModal` (2 tabs: WhatsApp recomendado / Correo) usado por LessonGate y
`/alumno/login` ("¿No tenés cuenta? Registrate").

### 2.6 Seguridad (ya mayormente cumplida — verificar y completar)
- Confirmar: contraseñas SOLO bcrypt (ya), admin nunca ve contraseñas (ya), sesión admin
  cookie httpOnly (ya, PR #2).
- Agregar en ficha de alumno del admin (`/admin/alumnos/[id]`): botón "Resetear
  contraseña" → endpoint admin que genera tempPassword nueva (reusar patrón de
  `createAlumno`) y opcionalmente la envía por WhatsApp al alumno.

## FASE 3 — QA (checklist del prompt, adaptado)
- Cada CTA de la landing navega a ruta real (cero `href="#"` / botones sin acción).
- 5 tarjetas de nivel → /planes?nivel=X con preselección visible.
- Lecciones 1-3 de cada ruta accesibles en incógnito; lección 4 muestra RegisterModal.
- Registro email+password y teléfono+OTP funcionan end-to-end (OTP real por WhatsApp).
- Admin: usuarios visibles sin contraseñas; reset password funciona.
- Responsive mobile-first; colores #0A2540/#00C4B4; sitemap.xml y robots.txt servidos.
- `tsc --noEmit` en ambos proyectos + build de producción + tests assert existentes verdes.

## Entregables
FLOW_AUDIT.md (Fase 1, ya generado) · diff schema.prisma · componentes NivelCard,
CursoVocacionalCard, LessonGate, RegisterModal · rutas corregidas · resumen final tipo PR.
