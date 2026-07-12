---
type: session
area: operaciones
date: 2026-05-17
slug: ceo-finanzas-marketing-cursos-implementados
title: "CEO dashboard, Finanzas, Marketing broadcast y gestión de Cursos implementados"
tags: [admin, frontend, backend, ceo-dashboard, finanzas, marketing-campanas, cursos-admin, recharts, jwt, bugfix, railway, vercel, task-master]
status: active
related:
  - 2026-05-17-admin-panel-metricas-reportes-csv
  - 2026-05-14-crm-fase1-backend-frontend-implementado
  - 2026-05-13-admin-rediseniado-saas-planificado
superseded_by: null
sources:
  - repo:app/admin/ceo/page.tsx
  - repo:app/admin/finanzas/page.tsx
  - repo:app/admin/marketing/page.tsx
  - repo:app/admin/cursos/page.tsx
  - repo:backend/src/routes/auth.ts
  - repo:backend/src/routes/marketing.ts
  - repo:backend/src/routes/finanzas.ts
  - repo:lib/api.ts
  - repo:app/admin/layout.tsx
---

# CEO dashboard, Finanzas, Marketing broadcast y gestión de Cursos implementados

## Contexto

Segunda sesión del día 2026-05-17. Continúa desde donde quedó la sesión anterior (resumida por compresión de contexto). Se completaron las últimas tareas del roadmap SaaS: Tasks 50, 51, 53, 54, 56 (Task Master). Al finalizar las tareas planificadas se descubrió un bug en la página `/admin/ediciones` y la ausencia de una página de gestión de cursos — ambos resueltos dentro de la misma sesión.

Total tasks completadas en el proyecto al cierre: **68/68 (100%).**

## Decisiones

- **`/api/auth/me` para guard de rol SUPER_ADMIN**: el CEO dashboard necesitaba verificar el rol del admin en el cliente. Se agregó `GET /api/auth/me` al backend (protegido con JWT) en lugar de decodificar el token client-side o pasar el rol como prop. El layout del sidebar también decodifica el JWT client-side (sin verificación criptográfica) para mostrar/ocultar el link "CEO" sin hacer un fetch extra.

- **getCursos() retornaba array plano, no `{ data: [] }`**: el backend de cursos fue escrito para retornar `Curso[]` directamente (no paginado como otros endpoints). `lib/api.ts` tenía `apiFetch<{ data: Curso[] }>` causando que `r.data` fuera `undefined` en runtime. La página crasheaba silenciosamente porque el estado inicial era `[]` (no producía error visible) pero el modal del filtro intentaba `cursos.map()` con `undefined`. Corregido a `apiFetch<Curso[]>`.

- **Campañas de marketing con `setInterval` (background fire-and-forget)**: el envío de mensajes masivos se implementó como background process post-response con `setInterval` (10 mensajes / 200ms = tasa máxima ~50 msg/s, bajo el límite de Meta de 80/s). Se eligió `setInterval` sobre worker threads o bull queues por simplicidad (Railway single-process). Trade-off: si el proceso se reinicia a mitad del envío, los mensajes quedan en estado PENDIENTE sin completarse automáticamente.

- **`/admin/cursos` es prerequisito de `/admin/ediciones`**: sin cursos registrados, el modal "Nueva edición" crasheaba (`cursos[0]?.id ?? 0` pasaba 0 al backend que fallaba validación). Se creó la página de gestión de cursos y se deshabilitó el botón "Nueva edición" cuando `cursos.length === 0` con tooltip explicativo.

- **Producción verificada por HTTP status**: se verificaron los 7 endpoints nuevos contra `api.mea.edu.gt`. Todos devuelven 401 (no 404), confirmando que las rutas existen y el middleware JWT está activo. Frontend verificado por HTTP 200 en `/admin/ceo`, `/admin/finanzas`, `/admin/marketing`.

## Output

### Task 50 — /admin/ceo (CEO Dashboard, SUPER_ADMIN)
- `app/admin/ceo/page.tsx` — nuevo. Guarda de rol: `api.getMe()` → redirige a `/admin` si `rol !== "SUPER_ADMIN"`.
- P&L LineChart (Recharts): 12 meses, líneas ingresos / egresos / utilidad
- Proyecciones BarChart: 6 meses de cuotas pendientes
- Flujo de caja 30d: tarjetas saldo actual, ingresos proyectados, egresos proyectados, flujo neto
- Tabla detallada P&L mensual con margen %

### Task 51 — /admin/finanzas
- `app/admin/finanzas/page.tsx` — nuevo. Tabs sin Radix (CSS puro).
- Tab Egresos: tabla con filtros (categoría + mes), paginación, modal crear/editar, soft-delete con confirm
- Tab Reconciliación: selector mes, pagos agrupados por método con totales GTQ/USD + fila grand total

### Task 53 — /api/marketing/campanas (backend)
- `backend/src/routes/marketing.ts` — nuevo. Montado en `/api/marketing`.
- `GET /campanas` — lista con `_count: { destinatarios }`.
- `POST /campanas` — Zod: `{ nombre, template, variables? }`.
- `POST /campanas/:id/enviar` — body `{ leadIds[] }`. Crea `CampanaDestinatario` en bulk, inicia background `setInterval`.
- `GET /campanas/:id/status` — `{ estado, totalDestinatarios, enviados, errores, progreso }`.
- `renderTemplate()` — reemplaza `{nombre}` y `{curso}` con datos reales del lead.

### Task 54 — /admin/marketing (frontend)
- `app/admin/marketing/page.tsx` — nuevo. 3 componentes: tabla `MarketingPage`, `NuevaCampanaModal`, `EnviarModal`.
- `NuevaCampanaModal`: campo nombre + textarea template con preview en vivo (renderización con lead de ejemplo).
- `EnviarModal`: flujo 3 pasos — (1) selección leads con filtro por estado y checkboxes, (2) confirmación con preview del primer lead seleccionado, (3) barra de progreso que hace polling `/status` cada 2s hasta estado COMPLETADA.

### Task 56 — EscalacionLog (verificado existente)
- El modelo `EscalacionLog` ya existía en `backend/prisma/schema.prisma` y su migración `20260516000000_add_escalacion_log/migration.sql`.
- El código en `backend/src/lib/claude.ts` y `backend/src/routes/whatsapp.webhook.ts` ya usaba `prisma.escalacionLog.create/updateMany`.
- Task marcada done sin cambios de código.

### Extras — Bug + nueva página de cursos
- **Fix `getCursos()` type**: `lib/api.ts` corregido de `apiFetch<{ data: Curso[] }>` a `apiFetch<Curso[]>`. Resolvía crash silencioso en `/admin/ediciones`.
- `app/admin/cursos/page.tsx` — nuevo. CRUD completo: tabla de cursos activos, modal crear/editar (nombre, descripción, precio GTQ, modalidad, duración), soft-delete con confirm. Estado vacío con CTA "Crear el primer curso".
- `app/admin/layout.tsx` — sidebar actualizado: añadidos iconos Library (Cursos), Wallet (Finanzas), Send (Marketing), LineChart (CEO — solo SUPER_ADMIN). Total: 10 items de navegación.
- `backend/src/routes/auth.ts` — `GET /api/auth/me` agregado (protegido JWT, devuelve perfil admin sin password).

### Commits pusheados
- `0ee6c92` — CEO + Finanzas + /api/auth/me
- `11587b8` — Marketing backend + UI
- `e4a793e` — Fix getCursos() type
- `d4961a1` — /admin/cursos management page

## Pendiente

- [ ] **Crear cursos en producción**: la BD de Railway no tiene cursos. El admin debe ir a `/admin/cursos` → "Nuevo curso" para empezar. Sin cursos no se pueden crear ediciones ni inscripciones.
- [ ] **Campañas en progreso sin recovery**: si Railway reinicia durante un envío en `ENVIANDO`, los destinatarios quedan `PENDIENTE` para siempre. Considerar un cron de recovery o endpoint manual de reanudar.
- [ ] **`/api/cursos` no devuelve cursos inactivos**: el admin no puede reactivar cursos desactivados desde la UI (no se muestran en tabla). Puede hacerse via `PATCH /api/cursos/:id` con `{ activo: true }` desde Postman.
- [ ] **Decidir estrategia de reply desde admin**: aún pendiente (Tasks 57, 58). Twilio de pago vs UI panel admin.
- [ ] Eliminar `/api/test-bot` antes de producción real.

## Cross-refs

- [[2026-05-17-admin-panel-metricas-reportes-csv]] — misma fecha, esta sesión completa las Tasks 50-56 del roadmap que la sesión anterior dejó pendientes; comparten `/admin/layout.tsx` y `lib/api.ts`
- [[2026-05-14-crm-fase1-backend-frontend-implementado]] — los modelos `CampanaWhatsApp`, `CampanaDestinatario`, `EscalacionLog` y `Egreso` creados en la Fase 2 (Task 45 de esa sesión) son la base del marketing y finanzas de esta sesión
- [[2026-05-13-admin-rediseniado-saas-planificado]] — las Tasks 50-56 ejecutadas aquí estaban definidas en el plan SaaS de esa sesión; esta sesión cierra el 100% del roadmap planificado allí

## Fuentes

- `repo:app/admin/ceo/page.tsx`
- `repo:app/admin/finanzas/page.tsx`
- `repo:app/admin/marketing/page.tsx`
- `repo:app/admin/cursos/page.tsx`
- `repo:backend/src/routes/auth.ts`
- `repo:backend/src/routes/marketing.ts`
- `repo:backend/src/routes/finanzas.ts`
- `repo:lib/api.ts`
- `repo:app/admin/layout.tsx`
