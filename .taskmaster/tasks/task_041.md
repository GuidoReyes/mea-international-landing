# Task ID: 41

**Title:** Create /admin/alumnos/[id] detail page with tabs

**Status:** done

**Dependencies:** 40 ✓

**Priority:** high

**Description:** Build alumno detail view with inscripciones, pagos, and conversaciones tabs

**Details:**

Create app/admin/alumnos/[id]/page.tsx. Fetch /api/alumnos/:id. Header: avatar with initials (first letter nombre + apellido), carnet badge, nombre completo, email, whatsapp. Use Radix Tabs (already installed). 3 tabs: 'Inscripciones', 'Pagos', 'Conversaciones'. Inscripciones tab: table with columns: Curso (edicion.nombre), Estado (badge), Monto, Fecha. Button 'Nueva inscripción' opens modal with edicion selector, monto input. Pagos tab: list all pagos from all inscripciones, columns: Curso, Estado (color badge), Monto GTQ/USD, Método, Fecha. Button 'Registrar abono' opens modal with pago selector, monto input. Conversaciones tab: list last 3 conversaciones with snippet, link to /admin/leads/[leadId] (join via telefono or create leadId relation in Alumno if needed, or show ConversacionWhatsApp.telefono). Loading skeletons, error states.

**Test Strategy:**

Navigate to alumno detail, verify all tabs render correctly. Create nueva inscripcion, verify appears in tab. Register abono, verify pago updates. Test with alumno with no data (empty states).
