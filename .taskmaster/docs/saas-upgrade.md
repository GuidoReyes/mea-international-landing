# PRD — mea.edu.gt SaaS Upgrade · Mayo 2026

## Contexto

mea.edu.gt ya tiene funcionando: landing page, backend Express+TypeScript en Railway,
MySQL+Prisma, Redis, JWT auth, WhatsApp bot con Claude AI, RAG Notion, panel admin
básico (login, leads list, lead detail), Cloudflare WAF, CI/CD Railway+Vercel.

Este PRD agrega las funcionalidades nuevas organizadas en 4 fases. NO modificar lo
ya implementado. Usar `prisma migrate deploy` en producción (nunca db push).
Soft-delete obligatorio (campo `activo: Boolean`) en todos los modelos nuevos.
Validación Zod en todas las rutas nuevas. Montos en DECIMAL(10,2) con columnas
`monto` (GTQ) y `montoUSD` separadas.

---

## FASE 0 — Seguridad (URGENTE · resolver antes de cualquier feature)

### F0-1: Headers HTTP de seguridad en Next.js
Agregar en `next.config.ts` el bloque `headers()` con:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.mea.edu.gt; frame-src https://challenges.cloudflare.com`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
Verificar que helmet() esté activo en todas las rutas del backend Express.

### F0-2: Logger condicional — eliminar console.log de producción
Buscar todos los `console.log` en `backend/src/routes/` y `backend/src/lib/`.
Crear `backend/src/lib/logger.ts` con función `log(level, msg, meta?)` que solo
escribe a stdout si `NODE_ENV !== 'production'` o si level es 'error'/'warn'.
Reemplazar todos los console.log por llamadas al logger.

### F0-3: Tabla AuditoriaAdmin y middleware de audit log
Crear modelo `AuditoriaAdmin` en Prisma:
```
id, adminId Int, accion String, recurso String, detalle String?, ip String?, creadoEn DateTime
```
Crear `backend/src/middleware/audit.middleware.ts`: función `auditLog(accion, recurso)`
que recibe req y guarda registro en AuditoriaAdmin. Aplicar en rutas POST/PATCH/DELETE
de leads, cursos y auth.
Correr `npx prisma migrate dev --name add-auditoria-admin`.

### F0-4: Cambiar pre-deploy command a prisma migrate deploy
En Railway → servicio backend → Settings → Deploy → Pre-deploy command:
cambiar de `npx prisma db push` a `npx prisma migrate deploy`.
Documentar en README.md la razón del cambio (no usar db push en producción).

### F0-5: Redirect 301 dominio raíz a www en Cloudflare
En Cloudflare → Rules → Redirect Rules: crear regla para que
`mea.edu.gt/*` redirija 301 a `https://www.mea.edu.gt/$1`.
Verificar que el record DNS raíz (@) apunte a Vercel con proxy activo.

---

## FASE 1 — Core CRM + Notificaciones + Export + Métricas

### F1-1: Modelos Prisma — Alumno, Edicion, Inscripcion, Pago, CuotaPago, CRMEtapa
Agregar al `prisma/schema.prisma` existente los siguientes modelos nuevos:

**Alumno**: id, carnet (unique, auto-generado "MEA-YYYY-####"), nombre, apellido,
email (unique), whatsapp?, fechaNacimiento?, pais default "GT", activo default true,
creadoEn, relaciones: inscripciones, certificados, auditoria.

**Edicion**: id, cursoId FK→Curso, nombre, fechaInicio, fechaFin, precio DECIMAL(10,2),
precioUSD DECIMAL(10,2)?, cupo default 20, activo default true, instructor?,
inscripciones relation.

**Inscripcion**: id, alumnoId FK→Alumno, edicionId FK→Edicion, estado default "ACTIVA"
(ACTIVA|COMPLETADA|CANCELADA), creadoEn, relaciones: pagos, certificado.

**Pago**: id, inscripcionId FK→Inscripcion, monto DECIMAL(10,2), montoUSD DECIMAL(10,2)?,
moneda default "GTQ", metodo (QPAYPRO|PAYPAL|BANRURAL|BI|EFECTIVO), estado default
"PENDIENTE" (PENDIENTE|PAGADO|VENCIDO), referencia?, creadoEn, relaciones: abonos, cuotas.

**CuotaPago**: id, pagoId FK→Pago, numeroCuota Int, monto DECIMAL(10,2), fechaVence DateTime,
estado default "PENDIENTE" (PENDIENTE|PAGADO|VENCIDO), pagadoEn DateTime?.

**CRMEtapa**: id, nombre, orden Int, color default "#00b4d8".
Extender modelo Lead existente: agregar etapaId Int? FK→CRMEtapa, valorEstimado
DECIMAL(10,2)? (GTQ), fechaCierreEstimada DateTime?, notasCRM String?, asignadoAdminId Int?.

Crear migración: `npx prisma migrate dev --name fase1-crm-models`.
Seed inicial de CRMEtapa con las 6 etapas: Nuevo (orden 1, #3B82F6), Contactado
(2, #F59E0B), Interesado (3, #8B5CF6), Propuesta (4, #EC4899), Negociación (5, #F97316),
Cerrado (6, #10B981).

### F1-2: Rutas backend — /api/alumnos
Crear `backend/src/routes/alumnos.ts` con Express Router.
Validación Zod en todos los endpoints. Proteger con verifyJWT.
- GET /api/alumnos: paginado (page, limit, search por nombre/email/carnet, activo filter). Include count inscripciones.
- GET /api/alumnos/:id: detalle con inscripciones (include edicion y pagos) y últimas 5 conversaciones.
- POST /api/alumnos: crear alumno, auto-generar carnet formato "MEA-YYYY-####" (año actual + secuencial 4 dígitos usando COUNT de alumnos del año). Hash temporal password con bcrypt. Validar email único.
- PATCH /api/alumnos/:id: actualizar campos permitidos (nombre, apellido, email, whatsapp, pais). No permitir cambiar carnet.
- DELETE /api/alumnos/:id: soft-delete (activo=false).
Montar en `src/index.ts` en `/api/alumnos`. Registrar audit log en POST/PATCH/DELETE.

### F1-3: Rutas backend — /api/ediciones e /api/inscripciones
Crear `backend/src/routes/ediciones.ts`:
- GET /api/ediciones: list con filter cursoId, activo. Include curso y count inscripciones.
- GET /api/ediciones/:id: detalle con inscripciones (include alumno, pagos con cuotas).
- POST /api/ediciones: crear edicion, validar que cursoId exista.
- PATCH /api/ediciones/:id: actualizar campos.
- DELETE /api/ediciones/:id: soft-delete.
- POST /api/ediciones/:id/inscribir: crear Inscripcion + Pago inicial en transacción Prisma. Body: { alumnoId, monto, moneda, metodo, numeroCuotas? }. Si numeroCuotas > 1, generar CuotaPago records distribuidos mensualmente desde hoy.

Crear `backend/src/routes/inscripciones.ts`:
- GET /api/inscripciones: list paginado con filters.
- GET /api/inscripciones/:id: detalle completo.
- PATCH /api/inscripciones/:id: cambiar estado.
- POST /api/inscripciones/importar-csv: parsear CSV multipart (campos: carnet_o_email, edicion_id, monto, metodo). Procesar en lote, retornar { exitosos, errores[] }.

### F1-4: Rutas backend — /api/pagos y /api/cuotas
Crear `backend/src/routes/pagos.ts`:
- GET /api/pagos: list paginado con filters (estado, moneda, metodo, fechaDesde, fechaHasta).
- GET /api/pagos/:id: detalle con abonos y cuotas.
- POST /api/pagos/:id/abonos: registrar abono. Body: { monto, nota? }. Si suma abonos >= pago.monto, cambiar estado a PAGADO.
- PATCH /api/pagos/:id: actualizar estado, referencia.

Crear `backend/src/routes/cuotas.ts`:
- GET /api/cuotas/consolidado: resumen de cuotas PENDIENTES y VENCIDAS agrupadas por edición. Parámetros: edicionId?, vencidaSolo?.
- GET /api/cuotas/pago/:pagoId: cuotas de un pago específico.
- PATCH /api/cuotas/:id: marcar como PAGADO (pagadoEn = now()).

### F1-5: Rutas backend — /api/crm (pipeline Kanban)
Crear `backend/src/routes/crm.ts`:
- GET /api/crm/pipeline: retornar todas las CRMEtapa con sus leads (include nombre, telefono, valorEstimado, asignadoAdmin). Ordenado por etapa.orden.
- GET /api/crm/etapas: list de etapas.
- PATCH /api/crm/leads/:id/etapa: mover lead a nueva etapa. Body: { etapaId }. Registrar en audit log.
- PATCH /api/crm/leads/:id: actualizar valorEstimado, fechaCierreEstimada, notasCRM, asignadoAdminId.
- GET /api/crm/stats: stats por etapa (count leads, suma valorEstimado).

### F1-6: Sistema de notificaciones — nuevo lead
Crear `backend/src/services/notifications.ts`.
Función `notifyAdminNewLead(lead)`: enviar WhatsApp a `process.env.ADMIN_WA_NUMBER`
con mensaje: "🆕 Nuevo lead\n📱 +{telefono}\n💬 {primerMensaje}".
Función `sendTransactionalEmail(to, subject, html)`: integración Microsoft Graph API
usando MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. Flujo client_credentials OAuth2
para obtener token, luego POST a `https://graph.microsoft.com/v1.0/users/{ADMIN_EMAIL}/sendMail`.
En `whatsapp.webhook.ts`: después de `guardarMensajes()`, si el lead es nuevo (recién creado),
llamar `notifyAdminNewLead(lead)` en background (sin await, no bloquear respuesta).
Agregar variables de entorno: ADMIN_WA_NUMBER, ADMIN_EMAIL, MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.

### F1-7: Export CSV de leads
En `backend/src/routes/leads.ts` agregar:
- GET /api/leads/export/csv: verifyJWT, mismos query params que GET /api/leads pero sin paginación.
Construir CSV con headers: id,nombre,email,telefono,estado,interes,etapa,creadoEn.
Escapar campos con comas usando comillas dobles. Set headers: Content-Type text/csv,
Content-Disposition attachment filename=leads-YYYY-MM-DD.csv. Registrar audit log.

En frontend `app/admin/page.tsx`: agregar botón "Exportar CSV" junto al contador de
resultados. Usa `window.open('/api/leads/export/csv?...')` pasando los filtros activos.
Ícono Download de lucide-react.

### F1-8: Dashboard de métricas — /admin/metricas
Crear `backend/src/routes/reportes.ts`:
- GET /api/reportes/leads: retornar { porEstado: {nuevo:n,...}, porEtapa: [{etapa,count,valor}],
  evolucion: [{fecha, total}] (últimos 30 días), tasaConversion: número % de nuevo→inscrito,
  tiempoPromedioCierre: días promedio }.

Crear página `app/admin/metricas/page.tsx`:
Instalar Recharts: `npm install recharts`.
- Card KPIs: Total leads, Tasa conversión, Tiempo promedio cierre, Valor pipeline total.
- BarChart (Recharts): leads por estado con colores del design system.
- LineChart: evolución diaria últimos 30 días.
- Funnel visual: divs con width proporcional al % de leads en cada etapa.
- Selector período: 7d / 30d / 90d que actualiza todas las gráficas.
Agregar link "Métricas" en el sidebar del layout admin con ícono BarChart2 de lucide-react.

### F1-9: Panel admin — /admin/alumnos y /admin/ediciones
Crear `app/admin/alumnos/page.tsx`:
- Tabla con columnas: Carnet, Nombre, Email, WhatsApp, Inscripciones (count), Registrado.
- Búsqueda por texto (nombre/email/carnet), filtro activo.
- Botón "Nuevo alumno" abre modal con form (nombre, apellido, email, whatsapp).
- Click en fila → /admin/alumnos/[id].
- Skeleton loading, empty state, paginación.

Crear `app/admin/alumnos/[id]/page.tsx`:
- Header con avatar inicial, carnet, datos de contacto.
- Tabs: "Inscripciones" / "Pagos" / "Conversaciones".
- Tab inscripciones: lista de inscripciones con edición, estado, monto. Botón "Nueva inscripción".
- Tab pagos: lista pagos con estado badge, monto GTQ/USD, método. Botón "Registrar abono".
- Tab conversaciones: últimas 3 conversaciones con link a detalle.

Crear `app/admin/ediciones/page.tsx`:
- Tabla ediciones agrupadas por curso. Columnas: Nombre, Curso, Fechas, Precio, Inscritos/Cupo, Estado.
- Filtro por curso. Botón "Nueva edición".
- Skeleton + empty state.

### F1-10: Panel admin — /admin/crm (Kanban)
Crear `app/admin/crm/page.tsx`:
- Layout horizontal con 6 columnas (una por CRMEtapa).
- Cada columna: header con nombre, color y count de leads + suma valorEstimado.
- Cards de lead: nombre, teléfono, valor estimado GTQ, días en etapa.
- Drag & drop para mover leads entre etapas. Usar `@dnd-kit/core` y `@dnd-kit/sortable`.
- Al soltar: PATCH /api/crm/leads/:id/etapa.
- Click en card abre drawer lateral con detalle del lead y notas CRM.
- Botón "+" en cada columna para asignar lead existente a esa etapa.
Agregar link "CRM" en sidebar con ícono Kanban de lucide-react.

---

## FASE 2 — Automatización + Finanzas + Comunicaciones

### F2-1: Modelos Prisma — Abono, Certificado, AuditoriaAlumno, Egreso, CampanaWhatsApp
Agregar modelos al schema.prisma:

**Abono**: id, pagoId FK→Pago, monto DECIMAL(10,2), fecha DateTime default now(), nota?.

**Certificado**: id, inscripcionId unique FK→Inscripcion, alumnoId FK→Alumno, codigo unique
(8 chars hex random), urlPdf?, urlQr?, emitidoEn DateTime default now(), activo default true.

**AuditoriaAlumno**: id, alumnoId FK→Alumno, accion, detalle?, adminId?, ip?, creadoEn.

**Egreso**: id, concepto, monto DECIMAL(10,2), moneda default "GTQ", categoria
(SALARIO|COMISION|OPERATIVO|MARKETING), fecha DateTime, activo default true.

**CampanaWhatsApp**: id, nombre, template, variables Json?, estado default "BORRADOR"
(BORRADOR|ENVIANDO|COMPLETADA), totalDestinatarios Int default 0,
enviados Int default 0, errores Int default 0, creadoEn, actualizadoEn,
detalle: CampanaDestinatario[].

**CampanaDestinatario**: id, campanaId FK→CampanaWhatsApp, leadId FK→Lead,
estado default "PENDIENTE" (PENDIENTE|ENVIADO|ERROR), error?, enviadoEn?.

Migración: `npx prisma migrate dev --name fase2-models`.

### F2-2: Scheduler node-cron — alertas de cuotas
Instalar: `npm install node-cron @types/node-cron`.
Crear `backend/src/scheduler.ts`.
Configurar zona horaria Guatemala (UTC-6 = TZ=America/Guatemala en Railway).
Cron 1 — Diario 8:00 AM Guatemala: consultar CuotaPago donde estado=PENDIENTE y
fechaVence = hoy+5 días → enviar WhatsApp al alumno: "⏰ Tu cuota de {curso} vence el {fecha}. Monto: Q{monto}."
Cron 2 — Diario 8:00 AM: cuotas que vencen HOY → WhatsApp urgente.
Cron 3 — Diario 9:00 AM: cuotas vencidas hace 1, 5 días → marcar estado=VENCIDO + WhatsApp.
Importar y ejecutar scheduler en `src/index.ts`.

### F2-3: Sistema de certificados — PDFKit + QR + validación pública
Instalar: `npm install pdfkit qrcode @types/pdfkit @types/qrcode`.
Crear `backend/src/routes/certificados.ts`:
- POST /api/certificados: body { inscripcionId }. Verificar que inscripcion.estado = COMPLETADA.
  Generar codigo = crypto.randomBytes(8).toString('hex'). Generar QR PNG con URL
  `https://www.mea.edu.gt/verify/{codigo}`. Generar PDF con PDFKit: logo MEA,
  "Certificado de Finalización", nombre alumno, curso, fecha, código QR. Subir PDF a
  Cloudflare R2 bucket (usando S3-compatible API). Guardar urlPdf, urlQr en Certificado.
- GET /api/certificados: list paginado con filter alumnoId.
- GET /api/certificados/verify/:codigo: público (sin JWT). Retornar datos del certificado
  o 404. Usar Redis cache 24h para evitar DB lookups repetidos.

Crear página pública `app/verify/[codigo]/page.tsx` (sin auth):
- Server component que llama /api/certificados/verify/:codigo.
- Si válido: mostrar nombre alumno, curso, fecha emisión, badge "Certificado Válido" verde.
- Si inválido: mensaje "Certificado no encontrado o revocado".
- Schema.org markup para SEO.

### F2-4: Rutas backend — /api/reportes CEO y /api/finanzas
Crear en `backend/src/routes/reportes.ts` (extender con):
- GET /api/reportes/pl: P&L mensual. Ingresos = sum(Pago.monto where estado=PAGADO, mes).
  Egresos = sum(Egreso.monto, mes). Retornar array últimos 12 meses con { mes, ingresos, egresos, utilidad }.
- GET /api/reportes/proyecciones: Ingresos proyectados = sum(CuotaPago.monto where estado=PENDIENTE,
  agrupado por mes). Próximos 6 meses.
- GET /api/reportes/flujo-caja: Saldo actual = sum pagados - sum egresos. Flujo próximos 30 días.

Crear `backend/src/routes/finanzas.ts`:
- GET /api/finanzas/egresos: list paginado con filters (categoria, mes).
- POST /api/finanzas/egresos: crear egreso con validación Zod.
- PATCH /api/finanzas/egresos/:id: actualizar.
- DELETE /api/finanzas/egresos/:id: soft-delete.
- GET /api/finanzas/reconciliacion: agrupar pagos por metodo (BANRURAL, BI, QPAYPRO)
  con suma por período. Permite comparar con extractos bancarios.

### F2-5: Panel CEO — /admin/ceo y /admin/finanzas
Crear `app/admin/ceo/page.tsx`:
- KPI cards: Ingresos mes actual, Egresos mes actual, Utilidad, Alumnos activos.
- LineChart (Recharts): P&L últimos 12 meses (líneas ingresos/egresos/utilidad).
- BarChart: proyecciones próximos 6 meses.
- Table: flujo de caja próximos 30 días por semana.
Solo accesible para rol SUPER_ADMIN. Verificar en el componente.

Crear `app/admin/finanzas/page.tsx`:
- Tabs: "Egresos" / "Reconciliación".
- Tab egresos: tabla con filtros categoria/mes, botón "Nuevo egreso".
- Tab reconciliación: tabla agrupada por método de pago con totales GTQ y USD.

### F2-6: Múltiples agentes IA por etapa CRM
Crear `backend/src/agents/agentRouter.ts`.
Definir AgentConfig con campos: systemPrompt, maxTokens, temperature.
Implementar selectAgent(lead): AgentConfig según lead.etapa?.nombre:
- "Nuevo": agente bienvenida — capta nombre, interés, presupuesto. Tono amigable, hace preguntas abiertas.
- "Interesado": agente calificación — detecta urgencia y budget. Menciona modalidades y precios.
- "Propuesta": agente cierre — supera objeciones, agenda llamada con asesor. CTA claro.
- default: agente general (comportamiento actual).
Actualizar `backend/src/lib/claude.ts`: en `responderMensaje()`, buscar lead por telefono en DB,
llamar selectAgent(lead), usar el systemPrompt del agente seleccionado.
Lógica de respuesta automática (espejo Edutek):
- Lead creado hace > 30 días sin responder: usar agente bienvenida completa.
- Último mensaje entre 1h y 30 días: usar agente con nombre del lead.
- Último mensaje hace < 1h: responder normalmente sin lógica especial.

### F2-7: Broadcast WhatsApp masivo
Crear `backend/src/routes/marketing.ts`:
- GET /api/marketing/campanas: list campañas.
- POST /api/marketing/campanas: crear campaña (nombre, template, variables).
- POST /api/marketing/campanas/:id/enviar: body { leadIds[] }. Crear CampanaDestinatario records.
  Procesar en background: enviar mensajes respetando rate limit Meta (80 msg/seg max).
  Usar setInterval con chunks de 10 mensajes cada 200ms. Actualizar contadores enviados/errores.
- GET /api/marketing/campanas/:id/status: retornar progreso en tiempo real.

Crear `app/admin/marketing/page.tsx`:
- Tabla de campañas con estado badge.
- Botón "Nueva campaña" → modal: nombre, texto del mensaje con variables {nombre}, {curso}.
- Selector de destinatarios: filtro por estado lead, etapa CRM.
- Preview del mensaje con variables rellenas con datos del primer lead seleccionado.
- Botón "Enviar" con confirmación (modal "¿Enviar a N leads?").
- Polling cada 2s al /status para mostrar progreso: "Enviados: X / N".

---

## FASE 3 — Portal Alumno + SEO

### F3-1: Autenticación portal alumno
Extender `backend/src/routes/auth.ts`:
- POST /api/auth/alumno/login: acepta { carnet, password }. Buscar Alumno por carnet.
  bcrypt.compare password. Generar JWT con payload { alumnoId, carnet, rol: 'ALUMNO' } 24h.
  Primer login (campo `primerLogin: Boolean`): forzar cambio de contraseña.
- POST /api/auth/alumno/cambiar-password: verifica token alumno, valida nueva password
  (min 8 chars, 1 número), hashea con bcrypt, guarda, actualiza primerLogin=false.
Agregar campo `password String?, primerLogin Boolean @default(true)` a modelo Alumno.
Migración: `npx prisma migrate dev --name alumno-auth`.
Crear `backend/src/middleware/alumnoAuth.middleware.ts`: verifyAlumnoJWT similar al admin.

### F3-2: Portal alumno — /portal/*
Crear `app/portal/layout.tsx`: layout simple con logo MEA y logout. Sin sidebar complejo.
Sin acceso si no hay token alumno en localStorage.

Crear `app/portal/login/page.tsx`:
- Form carnet + password. Dark theme consistente con admin login.
- Si primer login: redirect a /portal/cambiar-password.

Crear `app/portal/cambiar-password/page.tsx`:
- Form nueva contraseña + confirmación. Validación frontend: 8+ chars, 1 número.

Crear `app/portal/dashboard/page.tsx`:
- Header: "Hola, {nombre}" con carnet.
- Cards: Cursos activos, Próxima clase, Pagos pendientes.
- Lista de inscripciones activas con edición, estado pago, % avance.

Crear `app/portal/pagos/page.tsx`:
- Lista cuotas agrupadas por curso. Badge estado (PENDIENTE naranja, VENCIDO rojo, PAGADO verde).
- Botón "Ver detalle" por cuota.

Crear `app/portal/certificados/page.tsx`:
- Lista certificados del alumno autenticado.
- Botón "Descargar PDF" → link a urlPdf en Cloudflare R2.
- Botón "Ver validación" → link a /verify/{codigo}.

---

## Variables de entorno nuevas necesarias en Railway

```
ADMIN_WA_NUMBER=       # WhatsApp del admin para notificaciones
ADMIN_EMAIL=           # Email del admin
MS_TENANT_ID=          # Azure AD Tenant
MS_CLIENT_ID=          # Azure App Registration Client ID
MS_CLIENT_SECRET=      # Azure App Registration Secret
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=mea-storage
CLOUDFLARE_R2_PUBLIC_URL=  # https://pub-xxxx.r2.dev o custom domain
NODE_ENV=production
TZ=America/Guatemala
```
