# Task ID: 33

**Title:** Implement /api/crm Kanban pipeline routes

**Status:** done

**Dependencies:** 28 ✓

**Priority:** high

**Description:** Create CRM stage management and lead stage transition endpoints for Kanban board

**Details:**

Create backend/src/routes/crm.ts. GET /api/crm/pipeline: return all CRMEtapa ordered by orden ASC, include leads for each stage. Lead includes: id, nombre, telefono, valorEstimado, asignadoAdminId, asignadoAdmin relation (select: id, nombre). Structure: [{etapa: CRMEtapa, leads: Lead[]}]. GET /api/crm/etapas: simple list of stages. PATCH /api/crm/leads/:id/etapa: Zod validate {etapaId}. Update lead.etapaId. Register auditLog with detalle showing old→new stage. PATCH /api/crm/leads/:id: Zod validate {valorEstimado?, fechaCierreEstimada?, notasCRM?, asignadoAdminId?}. Update fields. GET /api/crm/stats: return per-stage stats: {etapaId, nombre, color, countLeads, sumValorEstimado}. Use aggregate queries. Mount in index.ts.

**Test Strategy:**

Seed leads in different stages. Call GET /api/crm/pipeline, verify grouped by stage. Move lead between stages via PATCH, verify etapaId updated and audit log created. Check stats endpoint returns correct sums.
