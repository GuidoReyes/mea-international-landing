# Task ID: 143

**Title:** Create admin endpoints for manual payment approval workflow

**Status:** done

**Dependencies:** 139 ✓, 142 ✓

**Priority:** high

**Description:** Implement new routes file backend/src/routes/pagos-deposito.ts with list, confirm, and reject endpoints for admin panel

**Details:**

Create backend/src/routes/pagos-deposito.ts:

1. Import verifyJWT from middleware/auth.middleware, auditLog from middleware/audit.middleware
2. Mount all routes under /api/admin/pagos-deposito
3. All routes use verifyJWT middleware

GET / — list pending deposits:
- Query param: estado (optional filter, defaults to PENDIENTE)
- Query PagoSuscripcion where proveedor='deposito_bi', include suscripcion.alumno (nombre, apellido, carnet, email) and suscripcion.planPrecio.plan (nombre)
- Order by creadoEn desc
- Return array with pagos and nested alumno/plan data for table display

PATCH /:id/confirmar — approve payment:
- Middleware: auditLog('CONFIRMAR_PAGO_DEPOSITO', 'pagos_deposito')
- Fetch PagoSuscripcion with suscripcion.planPrecio relation
- Update PagoSuscripcion: estado=COMPLETADO, pagadoEn=now()
- Activate Suscripcion:
  - If fechaInicio is null, set to now()
  - Calculate fechaFin = agregarMeses(fechaInicio, planPrecio.duracionMeses) — REUSE function from lib/recurrente.ts
  - Set estado=ACTIVA
- Response: { success: true, pagoId, suscripcionId }

PATCH /:id/rechazar — reject payment:
- Middleware: auditLog('RECHAZAR_PAGO_DEPOSITO', 'pagos_deposito')
- Optional body: { motivo?: string }
- Update PagoSuscripcion: estado=RECHAZADO
- Suscripcion stays PENDIENTE (student can retry with new payment)
- Response: { success: true, pagoId, motivo }

Mount router in backend/src/index.ts under /api/admin/pagos-deposito

**Test Strategy:**

Integration tests: (1) GET / returns only deposito_bi payments with correct nesting, (2) confirmar sets PagoSuscripcion to COMPLETADO and activates Suscripcion with correct dates using agregarMeses, (3) rechazar sets RECHAZADO and logs motivo, (4) audit logs are created for both actions, (5) unauthorized requests get 401, (6) verify fechaFin calculation matches Recurrente webhook logic
