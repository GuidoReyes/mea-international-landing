# Task ID: 147

**Title:** Create admin panel page for manual payment approval

**Status:** done

**Dependencies:** 143 ✓

**Priority:** medium

**Description:** Implement app/admin/pagos-deposito/page.tsx with table of pending receipts and approve/reject actions

**Details:**

Create app/admin/pagos-deposito/page.tsx:

1. Server component fetches initial data from GET /api/admin/pagos-deposito?estado=PENDIENTE
2. Client component for interactive table (use 'use client' directive)
3. Table columns:
   - Alumno (nombre, apellido, carnet)
   - Email
   - Plan (plan.nombre)
   - Monto (formatted from montoCentavos)
   - Mes pagado
   - Fecha envío (creadoEn formatted)
   - Estado (badge: PENDIENTE=yellow, COMPLETADO=green, RECHAZADO=red)
   - Comprobante (link button → opens comprobanteUrl in new tab with target='_blank')
   - Actions (Confirmar / Rechazar buttons for PENDIENTE rows only)

4. Actions:
   - Confirmar: PATCH /api/admin/pagos-deposito/:id/confirmar, on success refresh table
   - Rechazar: show prompt for motivo (optional), PATCH /api/admin/pagos-deposito/:id/rechazar with body, refresh

5. Layout: reuse existing admin layout patterns from app/admin/leads/page.tsx or app/admin/finanzas/page.tsx
   - Same nav/header structure
   - Same table styling (Tailwind classes)
   - Same filter/pagination patterns if needed

6. Add navigation link in admin dashboard sidebar/menu

Validation: Page matches visual style of other admin pages, no new design system

**Test Strategy:**

Manual E2E test: (1) page lists all pending deposito_bi payments with correct student/plan info, (2) clicking 'Ver boleta' opens Drive link in new tab showing uploaded receipt, (3) Confirmar button activates Suscripcion and updates table to show COMPLETADO, (4) Rechazar prompts for motivo and updates to RECHAZADO, (5) table refreshes after actions, (6) verify audit logs are created in AuditoriaAdmin table
