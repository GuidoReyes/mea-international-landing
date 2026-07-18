# Task ID: 51

**Title:** Create /admin/finanzas page with egresos and reconciliation tabs

**Status:** done

**Dependencies:** 49 ✓

**Priority:** medium

**Description:** Build financial management page for expense tracking and payment method reconciliation

**Details:**

Create app/admin/finanzas/page.tsx. Use Radix Tabs: 'Egresos' and 'Reconciliación'. Egresos tab: table with filters (categoria dropdown, mes date picker). Columns: Concepto, Monto, Moneda, Categoría (badge with color per category), Fecha. Button 'Nuevo egreso' opens modal: inputs concepto, monto, moneda (select GTQ/USD), categoria (select enum), fecha (date picker). POST /api/finanzas/egresos. Pagination. Reconciliación tab: month selector (default current month). Fetch /api/finanzas/reconciliacion?mes=YYYY-MM. Table grouped by metodo: QPAYPRO, PAYPAL, BANRURAL, BI, EFECTIVO. Columns: Método, Total GTQ, Total USD, Transacciones (count). Add totals row at bottom. Helpful for comparing with bank statements.

**Test Strategy:**

Create egresos in different categories, verify table and filters. Test reconciliation for specific month with multiple payment methods. Verify totals sum correctly.
