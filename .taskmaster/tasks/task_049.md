# Task ID: 49

**Title:** Create /api/reportes/pl and /api/finanzas routes for CEO dashboard

**Status:** done

**Dependencies:** 45 ✓

**Priority:** medium

**Description:** Build P&L reporting and expense management endpoints with projections and cash flow

**Details:**

Extend backend/src/routes/reportes.ts. GET /api/reportes/pl: calculate monthly P&L for last 12 months. Ingresos: sum(Pago.monto where estado=PAGADO, group by month). Egresos: sum(Egreso.monto, group by month). Return array [{mes: 'YYYY-MM', ingresos, egresos, utilidad: ingresos-egresos}]. Use date-fns for date manipulation. GET /api/reportes/proyecciones: sum(CuotaPago.monto where estado=PENDIENTE, group by month of fechaVence). Next 6 months. GET /api/reportes/flujo-caja: calculate saldo actual = sum(Pago.monto where estado=PAGADO) - sum(Egreso.monto). Flujo próximos 30 días = sum(CuotaPago.monto where estado=PENDIENTE AND fechaVence <= now()+30 days) - estimated monthly egresos (avg last 3 months). Create backend/src/routes/finanzas.ts. GET /api/finanzas/egresos: paginated list with filters (categoria, mes as YYYY-MM). POST: create Egreso with Zod validation. PATCH /:id: update. DELETE: soft-delete. GET /api/finanzas/reconciliacion: query params mes (YYYY-MM). Group Pago by metodo where mes matches, sum monto for each metodo, separate GTQ and USD. Return [{metodo, totalGTQ, totalUSD}].

**Test Strategy:**

Seed pagos and egresos across 12 months. Call /api/reportes/pl, verify 12 months returned with correct sums. Test proyecciones includes future cuotas. Test flujo-caja calculation. Create egreso, verify filters work. Test reconciliacion groups correctly.
