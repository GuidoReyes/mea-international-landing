# Task ID: 38

**Title:** Install Recharts and create /admin/metricas dashboard page

**Status:** done

**Dependencies:** 37 ✓

**Priority:** medium

**Description:** Build interactive metrics dashboard with KPIs, charts, and funnel visualization using Recharts

**Details:**

Run npm install recharts in root project. Create app/admin/metricas/page.tsx as 'use client'. Fetch from /api/reportes/leads on mount. Display 4 KPI cards: Total leads, Tasa conversión %, Tiempo promedio cierre (días), Valor pipeline total (sum valorEstimado from all leads). Use recharts BarChart for leads por estado (X: estado, Y: count, colors from design system: blue, amber, emerald). Use LineChart for evolucion (X: fecha, Y: total, area under curve filled). Create funnel visual: 6 divs (one per stage) with width proportional to % of leads in that stage, background color from CRMEtapa.color. Add period selector: buttons 7d/30d/90d that refetch data. Import necessary recharts components: BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Area, ResponsiveContainer. Style cards consistent with admin/page.tsx design.

**Test Strategy:**

Navigate to /admin/metricas, verify charts render. Change period selector, verify data updates. Test responsive layout on mobile. Check colors match design system.
