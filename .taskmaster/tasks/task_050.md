# Task ID: 50

**Title:** Create /admin/ceo dashboard with P&L charts and role restriction

**Status:** pending

**Dependencies:** 49, 38

**Priority:** medium

**Description:** Build executive dashboard with financial KPIs and visualizations, accessible only to SUPER_ADMIN

**Details:**

Create app/admin/ceo/page.tsx as 'use client'. Check admin.rol === 'SUPER_ADMIN' (read from JWT decoded or API call /api/auth/me). If not, redirect to /admin with message. Fetch /api/reportes/pl, /api/reportes/proyecciones, /api/reportes/flujo-caja. Display 4 KPI cards: Ingresos mes actual (last month from pl), Egresos mes actual, Utilidad mes actual, Alumnos activos (count from /api/alumnos?activo=true). Use Recharts LineChart: X=mes, 3 lines (ingresos, egresos, utilidad) with different colors. BarChart for proyecciones (X=mes, Y=monto proyectado). Table for flujo-caja showing next 4 weeks with estimated inflows/outflows. Add link in sidebar (only visible if SUPER_ADMIN): 'CEO Dashboard', icon TrendingUp.

**Test Strategy:**

Login as SUPER_ADMIN, verify page accessible and data renders. Login as regular ADMIN, verify redirect or 403. Test charts with real data. Check calculations match raw data.
