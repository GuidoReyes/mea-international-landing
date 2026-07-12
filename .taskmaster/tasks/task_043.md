# Task ID: 43

**Title:** Install dnd-kit and create /admin/crm Kanban board

**Status:** done

**Dependencies:** 33 ✓

**Priority:** high

**Description:** Build drag-and-drop CRM pipeline board with stage columns and lead cards

**Details:**

Run npm install @dnd-kit/core @dnd-kit/sortable. Create app/admin/crm/page.tsx. Fetch /api/crm/pipeline. Render 6 columns (one per CRMEtapa). Each column: header with etapa.nombre, background etapa.color (light tint), count of leads, sum of valorEstimado. Lead cards: nombre, telefono (masked last 4 digits), valorEstimado formatted Q#,###, días en etapa (calculate from audit log or creadoEn). Implement DndContext, SortableContext per column. onDragEnd: extract leadId and new etapaId, PATCH /api/crm/leads/:id/etapa, optimistically update local state. Click card opens drawer (shadcn Sheet or custom) on right side: full lead detail, form for notasCRM (textarea), asignadoAdminId (select), valorEstimado, fechaCierreEstimada inputs. Save updates with PATCH /api/crm/leads/:id. Button '+' in column header opens modal to assign existing lead to that stage (search by telefono/nombre).

**Test Strategy:**

Drag lead between stages, verify PATCH request succeeds, card moves. Open drawer, edit notasCRM, save, verify persists. Test with many leads (20+ per column) for performance. Verify colors from CRMEtapa apply correctly.

## Subtasks

### 43.1. Install dnd-kit dependencies

**Status:** pending  
**Dependencies:** None  

Install @dnd-kit/core and @dnd-kit/sortable packages required for drag-and-drop functionality in the Kanban board

**Details:**

Run `npm install @dnd-kit/core @dnd-kit/sortable` in the project root. These packages provide the core drag-and-drop primitives and sortable list utilities needed for the Kanban board. Verify installation by checking package.json dependencies. The @dnd-kit library is modern, lightweight, and works well with React 19 unlike react-beautiful-dnd which has compatibility issues.

### 43.2. Create API client methods for CRM pipeline

**Status:** pending  
**Dependencies:** 43.1  

Extend lib/api.ts with TypeScript interfaces and API methods for fetching pipeline data, updating lead stages, and managing lead details

**Details:**

Add TypeScript interfaces: CRMEtapa (id, nombre, orden, color), CRMLead (id, nombre, telefono, etapaId, valorEstimado, fechaCierreEstimada, notasCRM, asignadoAdminId, creadoEn, _count?), PipelineResponse (etapas: Array<CRMEtapa & {leads: CRMLead[]}>). Add api methods: getPipeline() => GET /api/crm/pipeline, patchLeadEtapa(leadId: number, etapaId: number) => PATCH /api/crm/leads/:id/etapa with body {etapaId}, patchCRMLead(leadId: number, data: {notasCRM?, asignadoAdminId?, valorEstimado?, fechaCierreEstimada?}) => PATCH /api/crm/leads/:id. Follow existing api.ts patterns using apiFetch helper.

### 43.3. Build Kanban board layout with column headers and statistics

**Status:** pending  
**Dependencies:** 43.2  

Create app/admin/crm/page.tsx with horizontal scrolling layout, render 6 stage columns with headers showing etapa name, color-coded backgrounds, lead count, and total estimated value

**Details:**

Create 'use client' component at app/admin/crm/page.tsx. Use useState for pipeline data and loading state. useEffect to fetch api.getPipeline() on mount. Render horizontal flex container (overflow-x-auto) with 6 columns (one per CRMEtapa, sorted by orden). Each column: min-width 320px, border-r, padding. Column header: display etapa.nombre, background with etapa.color at 10% opacity (use style={{backgroundColor: `${etapa.color}10`}}), show count of leads (etapa.leads.length), sum of valorEstimado (use reduce, format as Q#,### with Intl.NumberFormat). Add '+' button in header for future assign-lead modal. Use design system colors from existing admin pages: text-[#0A2540], bg-white, border-slate-100, rounded-2xl for cards. Include loading skeletons matching the style in app/admin/page.tsx.

### 43.4. Implement draggable lead cards with masked phone and formatted values

**Status:** pending  
**Dependencies:** 43.3  

Create lead card components within columns showing nombre, masked telefono, formatted valorEstimado, and días en etapa calculation, with drag-and-drop functionality using dnd-kit

**Details:**

Import DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors from @dnd-kit/core. Import SortableContext, verticalListSortingStrategy, useSortable from @dnd-kit/sortable. Wrap entire board in <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>. Each column wrapped in <SortableContext items={etapa.leads.map(l => String(l.id))} strategy={verticalListSortingStrategy}>. Create LeadCard component using useSortable(id: String(lead.id)). Card displays: lead.nombre (or 'Sin nombre' if null), telefono masked showing only last 4 digits (e.g., '•••• 1234' using '••••' + telefono.slice(-4)), valorEstimado formatted as Q#,### using new Intl.NumberFormat('es-GT', {style: 'currency', currency: 'GTQ', minimumFractionDigits: 0}).format(valorEstimado), días en etapa calculated as Math.floor((Date.now() - new Date(lead.creadoEn).getTime()) / (1000*60*60*24)). Card styling: bg-white, border border-slate-100, rounded-xl, p-4, mb-2, hover:shadow-md, cursor-grab. Apply transform and transition from useSortable's setNodeRef, transform, transition.

### 43.5. Implement drag handler, optimistic updates, and lead detail drawer

**Status:** pending  
**Dependencies:** 43.4  

Handle onDragEnd to update lead stage via API, implement optimistic UI updates, and create a right-side drawer for viewing and editing full lead details

**Details:**

In handleDragEnd: extract leadId from active.id and new etapaId from over?.id (column id). If no change, return. Optimistically update local state by moving lead to new etapa in pipeline data. Call api.patchLeadEtapa(leadId, etapaId). On error, revert optimistic update and show error message. For drawer: create state [selectedLead, setSelectedLead] and [isDrawerOpen, setIsDrawerOpen]. On card click, setSelectedLead and setIsDrawerOpen(true). Render drawer as fixed right-side panel (or use custom Sheet component): w-96, fixed right-0, h-full, bg-white, shadow-2xl, z-50, transform transition (slide from right). Drawer content: lead.nombre, telefono (full), email if exists, creadoEn. Form with: textarea for notasCRM (controlled input), select for asignadoAdminId (fetch admins list or hardcode options), input type="number" for valorEstimado, input type="date" for fechaCierreEstimada. Save button calls api.patchCRMLead with form data, updates local state on success. Close button and backdrop click handler. Style form inputs matching existing admin panel aesthetic (border-slate-200, rounded-lg, focus:ring-[#0A2540]). For '+' button in column header: open modal/dialog to search existing leads by telefono/nombre and assign to that etapa (can be basic input + search button initially, or defer to separate subtask if needed - for this task, create placeholder button with console.log).
