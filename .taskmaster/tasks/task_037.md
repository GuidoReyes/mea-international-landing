# Task ID: 37

**Title:** Create /api/reportes endpoints for dashboard metrics

**Status:** done

**Dependencies:** 28 ✓

**Priority:** medium

**Description:** Build reporting API for leads funnel, conversion rates, and time-to-close statistics

**Details:**

Create backend/src/routes/reportes.ts. Install date-fns: npm install date-fns in backend. GET /api/reportes/leads: query param periodo (7d|30d|90d default 30d). Calculate: porEstado object {nuevo: count, contactado: count, ...}, porEtapa array [{etapaId, nombre, count, valorTotal}], evolucion array [{fecha: 'YYYY-MM-DD', total: count}] for last N days (use date-fns subDays, format), tasaConversion: (count leads estado=inscrito / total leads) * 100, tiempoPromedioCierre: avg days between creadoEn and when etapa reached 'Cerrado' (filter leads with etapa.nombre='Cerrado', calculate diff, average). Use Prisma aggregations and raw SQL if needed for complex date math. Mount in index.ts.

**Test Strategy:**

Seed leads across 30 days with various estados and etapas. Call /api/reportes/leads?periodo=30d, verify evolucion has 30 entries. Check tasaConversion calculation. Verify tiempoPromedioCierre excludes leads not in Cerrado stage.
