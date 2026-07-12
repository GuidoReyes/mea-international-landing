---
type: session
area: operaciones
date: 2026-05-17
slug: admin-panel-metricas-reportes-csv
title: "Admin panel restructurado: dashboard, métricas Recharts, reportes API y CSV export"
tags: [admin, frontend, recharts, reportes, csv-export, dashboard, date-fns, twilio, credenciales, railway]
status: active
related:
  - 2026-05-14-crm-fase1-backend-frontend-implementado
  - 2026-05-13-admin-rediseniado-saas-planificado
  - 2026-05-10-bot-whatsapp-claude-integrado
superseded_by: null
sources:
  - repo:app/admin/page.tsx
  - repo:app/admin/leads/page.tsx
  - repo:app/admin/metricas/page.tsx
  - repo:app/admin/layout.tsx
  - repo:backend/src/routes/leads.ts
  - repo:backend/src/routes/reportes.ts
  - repo:lib/api.ts
  - repo:backend/src/scripts/seed-admin.ts
---

# Admin panel restructurado: dashboard, métricas Recharts, reportes API y CSV export

## Contexto

Sesión de continuación del roadmap SaaS. Se ejecutaron Tasks 35, 36, 37, 38, 39 del Task Master y se restructuró completamente el admin panel que antes tenía `/admin` y `/admin/leads` apuntando a la misma tabla. También surgieron dos issues operacionales: la limitación del Twilio Sandbox para el caso de uso de monitoreo del admin, y el bloqueo del acceso al admin panel por credenciales no inicializadas en producción.

## Decisiones

- **Twilio Sandbox descartado para admin-reply**: el Sandbox de Twilio solo acepta mensajes de usuarios que previamente enviaron `join <código>` — no permite que el admin inicie conversaciones hacia el bot. El flujo deseado (admin escribe al sandbox → backend → cliente via Meta) no funciona con el Sandbox. Decisión: mantener el código Twilio deployado pero no activarlo. Alternativas evaluadas: (1) Twilio de pago con número propio ~$15/mes + aprobación WhatsApp Business, (2) UI de respuesta en el admin panel. Ninguna decidida aún.

- **Admin credentials — seed vía Railway CLI**: el admin de producción estaba registrado con `admin@mea.edu.gt / admin123` (defaults del seed script). Para actualizar a credenciales personales sin exponer la contraseña en el chat, se usó `railway run node -e "..."` con un one-liner que hace bcrypt.hash + prisma.admin.update por ID. Verificado via curl al endpoint `/api/auth/login`.

- **CSV export — fetch+blob sobre window.open**: el botón "Exportar CSV" usa `fetch()` con `Authorization: Bearer <token>` en el header, convierte la respuesta a Blob y genera un link temporal `<a>` para la descarga. Alternativa descartada: `window.open(url?token=...)` expone el JWT en la URL y en los logs del servidor.

- **Dashboard separado de Leads**: `/admin/page.tsx` era antes la tabla de leads. Se creó `/admin/leads/page.tsx` con la tabla y se rehizo `/admin/page.tsx` como dashboard real con KPIs (total leads, tasa conversión, inscritos activos, ingresos mes), distribución por estado con barras proporcionales, y accesos rápidos. Esto requirió actualizar el sidebar para que los links apunten a rutas correctas.

- **date-fns sobre Luxon/moment para reportes**: instalado solo en el backend. Se usó `subDays`, `format`, `startOfDay`, `endOfDay` para construir el array de evolución diaria y calcular el período del reporte.

- **Recharts sobre Chart.js / D3**: elegido por compatibilidad nativa con React (componentes JSX, no canvas imperativo). Se usó `AreaChart` para evolución, `BarChart` para distribución por estado, y barras CSS nativas para el funnel de etapas CRM (no componente de Recharts para el funnel).

## Output

### Tasks completadas (35, 36, 37, 38, 39)

**Task 35 — GET /api/leads/export/csv** (`backend/src/routes/leads.ts`):
- Acepta mismo filtro `?estado=` que el endpoint de lista
- Función `escapeCsv()` maneja commas, comillas dobles, saltos de línea (RFC 4180)
- Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=leads-YYYY-MM-DD.csv`
- Audit log `EXPORT_CSV` via middleware `auditLog()`

**Task 36 — Botón CSV en frontend** (`app/admin/leads/page.tsx`):
- Botón "Exportar CSV" con ícono `Download` (lucide-react)
- Respeta filtro de estado activo
- Approach seguro: fetch + blob + URL temporal

**Task 37 — /api/reportes** (`backend/src/routes/reportes.ts`, nuevo):
- `GET /api/reportes/leads?periodo=7d|30d|90d` — retorna `{ totalLeads, porEstado, porEtapa, evolucion, tasaConversion, tiempoPromedioCierre }`
- `GET /api/reportes/resumen` — KPIs rápidos: leads, nuevos 7/30 días, inscripciones activas, ingresos mes
- Instalado `date-fns` en `backend/package.json`

**Task 38+39 — /admin/metricas** (`app/admin/metricas/page.tsx`, nuevo):
- Selector período 7d / 30d / 90d
- 4 KPI cards con iconos lucide-react
- `AreaChart` (Recharts) — evolución diaria de nuevos leads con gradiente
- `BarChart` (Recharts) — leads por estado (azul/ámbar/esmeralda)
- Funnel horizontal con barras CSS — porcentaje proporcional al máximo de etapa, con valor estimado Q
- Link "Métricas" agregado al sidebar en `app/admin/layout.tsx`

**Reestructuración admin panel** (fuera de tasks, requerida por usuario):
- `app/admin/page.tsx` — reescrito como dashboard (KPIs + distribución + accesos rápidos)
- `app/admin/leads/page.tsx` — nuevo, tabla de leads movida aquí
- `app/admin/layout.tsx` — sidebar con 5 items: Dashboard, Leads, CRM, Alumnos, Métricas
- `lib/api.ts` — tipos `ReportesLeads`, `ReportesResumen`; métodos `getReportesLeads()`, `getReportesResumen()`

**Commit pusheado:** `8886d3c` → `main`

## Pendiente

- [ ] **Decidir estrategia de reply desde admin**: Twilio de pago vs. UI de respuesta en panel admin. Tasks 57, 58, 67, 68 bloqueadas hasta esta decisión.
- [ ] **Task 42** — `/admin/ediciones` página (sin bloqueos, disponible)
- [ ] **Tasks 45-51** — Modelos Fase 2: abonos, scheduler cron, certificados PDFKit, dashboard CEO, finanzas, broadcast WA
- [ ] **Task 46** — recordatorios de pago con node-cron (alta prioridad de negocio, depende de Task 45)
- [ ] Configurar Twilio en Railway solo si se decide usar la versión de pago
- [ ] Verificar que `seed:crm-etapas` fue corrido en Railway (la tabla `CRMEtapa` debe tener 6 etapas para el funnel de métricas)

## Cross-refs

- [[2026-05-14-crm-fase1-backend-frontend-implementado]] — esta sesión completa Tasks 35-39 del roadmap iniciado allí; el funnel de métricas usa CRMEtapa de esa sesión
- [[2026-05-13-admin-rediseniado-saas-planificado]] — el dashboard y la restructuración del admin ejecutan el diseño SaaS planificado allí
- [[2026-05-10-bot-whatsapp-claude-integrado]] — decisión de descartar Twilio Sandbox afecta la integración de monitoreo del bot definida en esa sesión
- [[2026-05-19-bot-notificaciones-asesor-implementadas]] — Twilio reevaluado aquí como canal de notificaciones al asesor (bracket-reply); pendiente configuración en Railway
- [[2026-05-17-ceo-finanzas-marketing-cursos-implementados]] — sesión del mismo día que completa Tasks 50-56 (CEO, Finanzas, Marketing, Cursos); comparten layout.tsx y lib/api.ts

## Fuentes

- `repo:app/admin/page.tsx`
- `repo:app/admin/leads/page.tsx`
- `repo:app/admin/metricas/page.tsx`
- `repo:app/admin/layout.tsx`
- `repo:backend/src/routes/leads.ts`
- `repo:backend/src/routes/reportes.ts`
- `repo:lib/api.ts`
- `repo:backend/src/scripts/seed-admin.ts`
