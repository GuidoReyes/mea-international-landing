# Task ID: 44

**Title:** Add CRM link to admin sidebar with Kanban icon

**Status:** pending

**Dependencies:** 43 ✓

**Priority:** low

**Description:** Update admin navigation to include CRM board link

**Details:**

In app/admin/layout.tsx, add link to /admin/crm. Import Kanban icon from lucide-react (use KanbanSquare if Kanban not available). Label: 'CRM', icon: Kanban, href: '/admin/crm'. Add to navigation list.

**Test Strategy:**

Verify link appears, navigates correctly, active state works.
