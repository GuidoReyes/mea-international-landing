# Task ID: 54

**Title:** Create /admin/marketing broadcast page with preview and progress tracking

**Status:** done

**Dependencies:** 53 ✓

**Priority:** medium

**Description:** Build marketing campaign UI with recipient selection, message preview, and real-time send progress

**Details:**

Create app/admin/marketing/page.tsx. Table of campaigns with estado badge. Button 'Nueva campaña' opens modal: input nombre, textarea template (show hint: use {nombre}, {curso}). Next step: recipient selection - filters by estado, etapa, interes. Show count of selected leads. Preview section: select first matching lead, render template with actual lead data. Confirmation modal: 'Enviar a N leads?' with final count. POST /api/marketing/campanas/:id/enviar. Show progress bar: poll /api/marketing/campanas/:id/status every 2s, update progress bar width and text 'Enviados: X / N'. Disable UI during send. Show success/error summary when complete. Add link to sidebar: 'Marketing', icon Send.

**Test Strategy:**

Create campaign, select leads by filter, verify preview renders correctly. Send campaign, watch progress bar update in real-time. Verify final counts match. Test cancellation (add cancel button that stops background process if implemented).
