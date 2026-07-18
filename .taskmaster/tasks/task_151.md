# Task ID: 151

**Title:** Add nivel query param support to /planes page

**Status:** done

**Dependencies:** 150 ✓

**Priority:** high

**Description:** Enable /planes to accept and handle ?nivel=A1..C1 query parameter for visual preselection

**Details:**

Modify app/planes/page.tsx to read searchParams.nivel. Pass nivel to PricingPlanes component. In components/planes/PricingPlanes.tsx, add visual highlighting/preselection when nivel is present (e.g., scroll to view, highlight border, or display banner like 'Planes recomendados para nivel {nivel}'). Persist nivel through to checkout or WhatsApp message in fallback flow. Ensure graceful handling of invalid nivel values.

**Test Strategy:**

Test /planes?nivel=A1, /planes?nivel=C1, /planes without param, /planes?nivel=invalid. Verify visual preselection works, invalid values handled gracefully, checkout flow preserves nivel context
