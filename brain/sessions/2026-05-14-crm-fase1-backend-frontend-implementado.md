---
type: session
area: operaciones
date: 2026-05-14
slug: crm-fase1-backend-frontend-implementado
title: "CRM Fase 1 implementada: 13 tareas, backend API completo y Kanban admin"
tags: [prisma, railway, backend, crm, kanban, frontend, typescript, migrations, agente-ia, inscripciones, pagos, csv-import, dnd-kit, multi-agente, audit-log]
status: active
related:
  - 2026-05-13-admin-rediseniado-saas-planificado
  - 2026-05-10-bot-whatsapp-claude-integrado
  - 2026-05-08-backend-railway-desplegado
superseded_by: null
sources:
  - repo:backend/prisma/schema.prisma
  - repo:backend/prisma.config.ts
  - repo:backend/prisma/migrations/20260514000000_fase1_crm_models/migration.sql
  - repo:backend/src/routes/alumnos.ts
  - repo:backend/src/routes/pagos.ts
  - repo:backend/src/routes/cuotas.ts
  - repo:backend/src/routes/crm.ts
  - repo:backend/src/routes/ediciones.ts
  - repo:backend/src/routes/inscripciones.ts
  - repo:backend/src/agents/agentRouter.ts
  - repo:app/admin/crm/page.tsx
  - repo:app/admin/alumnos/page.tsx
---

# CRM Fase 1 implementada: 13 tareas, backend API completo y Kanban admin

## Contexto

Continuación del roadmap SaaS planificado en la sesión anterior. Esta sesión ejecutó 13 tareas del Task Master en secuencia (Tasks 25, 26, 27, 28, 29, 30, 31, 32, 33, 40, 41, 43, 52), cubriendo toda la Fase 1 del CRM: modelos Prisma, 6 rutas REST nuevas, agent router multi-etapa, 3 páginas admin nuevas (alumnos list, alumno detail, Kanban CRM), y la integración completa con Railway vía migración manual SQL.

Restricción crítica: sin base de datos local. Toda la operación de migración fue manual — SQL escrito en el repositorio, aplicado via `prisma migrate deploy` en el shell de Railway.

## Decisiones

- **Prisma 7 rompe compatibilidad: `url` migrado a `prisma.config.ts`**: el campo `url` en el bloque `datasource` del `schema.prisma` ya no es válido en Prisma 7. Se creó `backend/prisma.config.ts` con `defineConfig({ datasource: { url: process.env.DATABASE_URL! } })`. Sin este cambio, el build falla con P1012.

- **Migración SQL manual sin DB local**: en lugar de `prisma db push` (inseguro, sin historial) o generar migraciones automáticas (requiere DB local), se escribió manualmente `migration.sql` con todo el DDL para las nuevas tablas. Se aplicó con `prisma migrate deploy` en el shell de Railway. Cuando la migración falló por `AuditoriaAdmin` ya existente, se usó `prisma migrate resolve --rolled-back` para limpiar el estado y se re-deployó.

- **TypeScript 6 requiere `"types": ["node"]` explícito**: sin esto, el compilador no reconoce `process`, `Buffer`, `__dirname`. Se agregó en `compilerOptions` del `tsconfig.json`.

- **Zod v4 rompe compatibilidad: `.errors` → `.issues`**: el campo de errores en `SafeParseError` cambió de `.errors` a `.issues`. Todos los schemas de validación actualizados.

- **dnd-kit cross-column Kanban con `useDraggable` + `useDroppable`**: `SortableContext` de dnd-kit es para reordenar ítems dentro de una misma lista. Para arrastrar entre columnas del Kanban CRM se usó la API de bajo nivel: `useDraggable` en cada card, `useDroppable` en cada columna, y `DragOverlay` para el efecto visual. Actualizaciones optimistas con rollback en error.

- **Multi-agent AI router por etapa CRM**: `selectAgent()` en `agentRouter.ts` selecciona systemPrompt + maxTokens + temperature según `lead.etapa.nombre`. Lógica temporal: leads inactivos >30 días reciben agente `Nuevo` (re-engagement); los activos usan el agente de su etapa. `claude.ts` fue actualizado para fetchear lead+etapa+lastMessage y llamar `selectAgent()`.

- **Inscripcion+Pago+CuotaPago en transacción atómica**: `POST /api/ediciones/:id/inscribir` crea los tres registros en `prisma.$transaction`. Si `numeroCuotas > 1`, genera las cuotas con `createMany` distribuyendo el monto mensualmente. El mismo patrón se usa en la importación CSV de inscripciones.

- **CSV import con multer memoryStorage + error isolation por fila**: `POST /api/inscripciones/importar-csv` procesa cada fila del CSV en un `try/catch` individual. Las filas con error se acumulan en `errores[]`; las exitosas en `exitosos[]`. El response final incluye ambas listas para reporte parcial.

- **Carnet auto-generado con formato `MEA-YYYY-####`**: al crear un alumno, si no se provee carnet, se genera automáticamente contando los alumnos existentes del año en curso. Garantiza unicidad sin UUIDs.

- **Dockerfile: `prisma generate` antes de `npm run build`**: el orden importa — si el build TypeScript corre antes de que Prisma genere el cliente, los imports fallan. Orden correcto: `npx prisma generate && npm run build`.

## Output

### Backend — modelos Prisma (Task 28)
- `backend/prisma/schema.prisma` — reescrito con enums (InscripcionEstado, PagoEstado, MetodoPago, Moneda) y modelos (CRMEtapa, Alumno, Edicion, Inscripcion, Pago, CuotaPago, Certificado). `url` eliminado del datasource.
- `backend/prisma.config.ts` (nuevo) — `defineConfig({ datasource: { url: process.env.DATABASE_URL! } })`
- `backend/prisma/migrations/20260514000000_fase1_crm_models/migration.sql` (nuevo) — DDL completo para todas las tablas CRM
- `backend/src/scripts/seed-crm-etapas.ts` (nuevo) — upsert de 6 etapas del pipeline (Nuevo, Contactado, Interesado, Propuesta, Negociación, Cerrado)

### Backend — rutas REST nuevas (Tasks 29, 30, 31, 32, 33)
- `backend/src/routes/alumnos.ts` — CRUD con carnet auto-generado, soft-delete, auditLog
- `backend/src/routes/pagos.ts` — listado paginado con filtros, detail con cuotas, PATCH estado
- `backend/src/routes/cuotas.ts` — GET /consolidado agrupado por edición, PATCH marcar completado
- `backend/src/routes/crm.ts` — GET /pipeline, GET /etapas, GET /stats, PATCH /leads/:id/etapa, PATCH /leads/:id
- `backend/src/routes/ediciones.ts` — CRUD completo + POST /:id/inscribir (transacción atómica)
- `backend/src/routes/inscripciones.ts` — GET list/detail, PATCH estado, POST /importar-csv (multer + CSV parser)
- `backend/src/middleware/audit.middleware.ts` (nuevo) — factory `auditLog(accion, recurso)` para todas las mutaciones
- `backend/src/index.ts` — todas las rutas nuevas montadas

### Backend — agente IA multi-etapa (Task 52)
- `backend/src/agents/agentRouter.ts` (nuevo) — 6 configs de agente + default + lógica `selectAgent()`
- `backend/src/lib/claude.ts` — actualizado para fetchear lead+etapa+lastMessage y usar `selectAgent()`

### Frontend admin — páginas nuevas (Tasks 40, 41, 43)
- `app/admin/alumnos/page.tsx` — tabla con search debounced 300ms, filtro activo, paginación, modal nuevo alumno (muestra carnet + tempPassword)
- `app/admin/alumnos/[id]/page.tsx` — Radix Tabs (Inscripciones, Pagos, Conversaciones), NuevaInscripcionModal, PagosTab
- `app/admin/crm/page.tsx` — Kanban dnd-kit con 6 columnas, DragOverlay, drawer lateral para editar lead
- `lib/api.ts` — tipos CRMEtapa, CRMLead, Alumno, Edicion, Inscripcion, Pago; métodos getPipeline, getAlumnos, createAlumno, etc.

### Infrastructure (Tasks 25, 26, 27)
- `backend/src/routes/cursos.ts` — `auditLog` aplicado a POST/PATCH/DELETE (Task 25)
- `Dockerfile` — orden `prisma generate && npm run build`, CMD como JSON array (Task 26)
- Cloudflare redirect 301 `mea.edu.gt → www.mea.edu.gt` — configurado manualmente en dashboard (Task 27)

### Bugs resueltos en Railway
- P3008 (migración ya aplicada) → `migrate resolve --applied 0_init`
- P3009 (migración fallida) → `migrate resolve --rolled-back`, DROP TABLE residual, re-deploy
- PrismaClientInitializationError → resuelto quitando `datasourceUrl` del constructor (el cliente lo lee del env automáticamente)

## Pendiente

- [ ] **Ejecutar `npm run seed:crm` en Railway shell** — script deployado pero no corrido aún; sin esto, la tabla `CRMEtapa` está vacía y el pipeline no funciona
- [ ] Tasks 34-39 (notificaciones, export CSV, métricas, páginas admin adicionales)
- [ ] Tasks 42, 44-51 (modelos Fase 2, scheduler, certificados PDFKit+QR+R2, reportes CEO, finanzas, broadcast WA)
- [ ] Tasks 53-54 (portal alumno)
- [ ] Eliminar `/api/test-bot` de `backend/src/index.ts` antes de producción real
- [ ] Configurar variables Railway pendientes: `ADMIN_WA_NUMBER`, `ADMIN_EMAIL`, `MS_TENANT_ID`, `MS_CLIENT_*`, `CLOUDFLARE_R2_*`, `TZ=America/Guatemala`
- [ ] Crear cuenta Azure AD para MS Graph API (correo transaccional)
- [ ] Crear bucket Cloudflare R2 `mea-storage`

## Cross-refs

- [[2026-05-13-admin-rediseniado-saas-planificado]] — esta sesión ejecuta el roadmap SaaS planificado allí (Tasks 23-54); las 13 tareas aquí son la Fase 1 del plan
- [[2026-05-10-bot-whatsapp-claude-integrado]] — agentRouter.ts extiende el bot Claude de esa sesión con lógica multi-etapa CRM
- [[2026-05-08-backend-railway-desplegado]] — Railway backend extendido con 6 rutas nuevas, Prisma 7 y migración manual SQL
- [[2026-05-17-admin-panel-metricas-reportes-csv]] — Tasks 35-39 completadas allí: CSV export, reportes API y Recharts dashboard usando CRMEtapa de esta sesión
- [[2026-05-19-bot-notificaciones-asesor-implementadas]] — agentRouter.ts de esta sesión modificado: ESCALATION_INSTRUCTION expandida, WEB_CONTEXT sin número de teléfono
- [[2026-05-17-ceo-finanzas-marketing-cursos-implementados]] — los modelos Fase 2 (CampanaWhatsApp, Egreso, EscalacionLog) creados en Task 45 de esta sesión son la base del marketing y finanzas implementados allí

## Fuentes

- `repo:backend/prisma/schema.prisma`
- `repo:backend/prisma.config.ts`
- `repo:backend/prisma/migrations/20260514000000_fase1_crm_models/migration.sql`
- `repo:backend/src/routes/alumnos.ts`
- `repo:backend/src/routes/pagos.ts`
- `repo:backend/src/routes/cuotas.ts`
- `repo:backend/src/routes/crm.ts`
- `repo:backend/src/routes/ediciones.ts`
- `repo:backend/src/routes/inscripciones.ts`
- `repo:backend/src/agents/agentRouter.ts`
- `repo:app/admin/crm/page.tsx`
- `repo:app/admin/alumnos/page.tsx`
