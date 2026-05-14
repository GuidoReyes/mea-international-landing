---
type: session
area: operaciones
date: 2026-05-13
slug: admin-rediseniado-saas-planificado
title: "Panel admin rediseñado y roadmap SaaS completo planificado en Task Master"
tags: [admin-panel, frontend, tailwind, nextjs, task-master, crm, saas, prd, planificacion, diseño, kanban, certificados, pagos, alumno]
status: active
related:
  - 2026-05-10-bot-whatsapp-claude-integrado
  - 2026-05-08-backend-railway-desplegado
sources:
  - repo:app/admin/login/page.tsx
  - repo:app/admin/layout.tsx
  - repo:app/admin/page.tsx
  - repo:app/admin/leads/[id]/page.tsx
  - repo:.taskmaster/docs/saas-upgrade.md
  - repo:.taskmaster/tasks/tasks.json
superseded_by: null
---

# Panel admin rediseñado y roadmap SaaS completo planificado en Task Master

## Contexto

Continuación directa de la sesión anterior. Las 22 tareas del PRD original estaban 100% completas. Esta sesión tuvo dos objetivos distintos: (1) mejorar la calidad visual del panel admin usando la skill `frontend-design`, y (2) planificar el upgrade completo a SaaS+CRM a partir de un prompt maestro del usuario basado en la arquitectura Edutek Latam v1.0.

## Decisiones

- **Diseño del panel admin basado en dark sidebar `#0A2540` con acentos teal `#00C4B4`**: consistente con branding MEA. Las 4 páginas (login, layout, leads list, lead detail) siguen el mismo design system con tarjetas `bg-white border-slate-100 rounded-2xl`, badges con punto de color, y skeletons de carga.
- **Login usa glassmorphism oscuro**: `bg-white/[0.04] border border-white/10` sobre fondo `#0A2540`. Grid background pattern con `opacity-[0.04]`. Inputs con estilo glass. Consistente con el fondo del panel.
- **Estado de leads como pill buttons en lugar de `<select>`**: UX más directa para cambio de estado. Selector inline con spinner de guardado.
- **Conversación con separadores de fecha entre días**: mejor legibilidad en threads largos. Fecha calculada comparando `toDateString()` de mensajes consecutivos.
- **Lead detail con avatar de iniciales**: carnet generado de las primeras letras del nombre o los últimos 2 dígitos del teléfono si no hay nombre.
- **Estructura del PRD SaaS en 4 fases**: Fase 0 (seguridad), Fase 1 (CRM core), Fase 2 (automatización + finanzas), Fase 3 (portal alumno). Orden dictado por urgencia de seguridad y dependencias técnicas.
- **`prisma migrate deploy` en lugar de `db push` en Railway** (pendiente aplicar): `db push --accept-data-loss` es inseguro en producción y no lleva historial de migraciones.
- **Task Master `--append` para no borrar las 22 tareas existentes**: las nuevas 32 tareas (IDs 23-54) se añadieron al mismo `tasks.json` sin tocar lo ya completado.
- **Fase 0 de seguridad como bloque previo a cualquier nueva feature**: headers HTTP, logger condicional, AuditoriaAdmin, y redirect 301 son prerrequisitos de OWASP antes de CRM.
- **Agente IA multi-etapa con lógica temporal**: leads inactivos >30 días reciben agente bienvenida completo; entre 1h-30d usan agente de su etapa CRM con nombre personalizado; <1h respuesta normal. Espejo de Edutek Latam.

## Output

### Rediseño admin panel (4 archivos modificados, commiteados y pusheados)
- `app/admin/login/page.tsx` — dark glassmorphism, grid bg, inputs oscuros, spinner en botón
- `app/admin/layout.tsx` — sidebar fijo w-64, nav con active state teal, logout al fondo
- `app/admin/page.tsx` — 4 stat cards con Skeleton, filter pills, tabla con badges, empty state, paginación
- `app/admin/leads/[id]/page.tsx` — avatar iniciales, metadata row (Phone/Mail/Calendar), pill estado con spinner, separadores de fecha en chat, LeadSkeleton completo
- Commit: `feat: redesign admin panel with modern dark-sidebar aesthetic` (f88cbe7)
- Deploy: `https://www.mea.edu.gt/admin`

### PRD SaaS upgrade
- `.taskmaster/docs/saas-upgrade.md` — PRD completo con 4 fases, modelos Prisma, rutas backend, páginas frontend, variables de entorno

### Task Master — 32 tareas nuevas (IDs 23-54)
- **Fase 0** (IDs 23-27): headers HTTP, logger, AuditoriaAdmin, migrate deploy, redirect 301
- **Fase 1** (IDs 28-44): modelos Prisma CRM, `/api/alumnos`, `/api/ediciones`, `/api/inscripciones`, `/api/pagos`, `/api/cuotas`, `/api/crm`, notificaciones, export CSV, métricas, páginas admin Kanban
- **Fase 2** (IDs 45-54): modelos Fase 2, scheduler node-cron, certificados PDFKit+QR+R2, `/verify`, reportes CEO, finanzas, agentes multi-etapa, broadcast WA masivo
- Subtareas expandidas en: tasks 23 (4), 25 (4), 28 (5), 29 (5), 30 (5), 34 (4), 43 (5), 46 (4), 47 (5), 52 (4), 53 (4) → total ~50 subtareas

## Pendiente

- [ ] **Task 23 — PRÓXIMA**: headers HTTP de seguridad en `next.config.ts` (sin dependencias, urgente)
- [ ] Fase 0 completa (tasks 23-27) antes de empezar Fase 1
- [ ] Configurar variables Railway nuevas: `ADMIN_WA_NUMBER`, `ADMIN_EMAIL`, `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `CLOUDFLARE_R2_*`, `TZ=America/Guatemala`
- [ ] Seed CRMEtapa con 6 etapas del pipeline (parte de task 28.5)
- [ ] Crear cuenta Azure AD para MS Graph API (correo transaccional) — nueva dependencia de Fase 1
- [ ] Crear bucket Cloudflare R2 `mea-storage` — nueva dependencia de Fase 2
- [ ] Eliminar `/api/test-bot` en `backend/src/index.ts` (pendiente de sesión anterior)

## Cross-refs

- [[2026-05-10-bot-whatsapp-claude-integrado]] — sesión anterior: las 22 tareas originales estaban completas aquí; esta sesión agrega 32 tareas de upgrade SaaS
- [[2026-05-08-backend-railway-desplegado]] — arquitectura backend Railway que se extiende con CRM, pagos, certificados y scheduler en el nuevo roadmap

## Fuentes

- `repo:app/admin/login/page.tsx`
- `repo:app/admin/layout.tsx`
- `repo:app/admin/page.tsx`
- `repo:app/admin/leads/[id]/page.tsx`
- `repo:.taskmaster/docs/saas-upgrade.md`
- `repo:.taskmaster/tasks/tasks.json`
- [Arquitectura Edutek Latam v1.0](https://edutek.latam) — referencia de arquitectura usada como blueprint del PRD SaaS
