# Task ID: 32

**Title:** Implement /api/pagos and /api/cuotas routes with abono tracking

**Status:** done

**Dependencies:** 28 ✓

**Priority:** high

**Description:** Create payment management routes including partial payment (abono) registration and cuota consolidation

**Details:**

Create backend/src/routes/pagos.ts. GET /api/pagos: paginated list with filters (estado, moneda, metodo, fechaDesde, fechaHasta as ISO strings). Include inscripcion. GET /api/pagos/:id: include abonos array (will be added later in F2-1) and cuotas. POST /api/pagos/:id/abonos: Zod validate {monto, nota?}. Create Abono record (note: Abono model added in Phase 2, for now just prepare structure). Calculate sum of all abonos for pago, if sum >= pago.monto, update pago.estado='PAGADO'. PATCH /api/pagos/:id: update estado, referencia. Create backend/src/routes/cuotas.ts. GET /api/cuotas/consolidado: query params edicionId?, vencidaSolo?. Group CuotaPago by edicionId where estado PENDIENTE or VENCIDO. Return array {edicionId, edicion.nombre, totalCuotas, montoPendiente}. GET /api/cuotas/pago/:pagoId: list cuotas. PATCH /api/cuotas/:id: set estado=PAGADO, pagadoEn=now(). Mount both routers in index.ts.

**Test Strategy:**

Create pago with 3 cuotas, register partial abono, verify pago still PENDIENTE. Register final abono crossing monto threshold, verify pago becomes PAGADO. Test consolidado returns grouped stats. Mark cuota PAGADO, verify pagadoEn timestamp set.
