# Task ID: 39

**Title:** Add Métricas link to admin sidebar

**Status:** pending

**Dependencies:** 38

**Priority:** low

**Description:** Update admin layout navigation to include link to metrics dashboard

**Details:**

In app/admin/layout.tsx, add navigation link to /admin/metricas. Import BarChart2 icon from lucide-react. Add to sidebar nav array (if using array structure) or directly in JSX. Label: 'Métricas', icon: BarChart2, href: '/admin/metricas'. Ensure active state styling works (check current pathname matches /admin/metricas).

**Test Strategy:**

Verify link appears in sidebar, click navigates to /admin/metricas, active state highlights correctly. Test mobile menu if collapsible sidebar exists.
