# Task ID: 15

**Title:** Create Admin Panel Pages in Next.js

**Status:** done

**Dependencies:** 6 ✓, 14 ✓

**Priority:** low

**Description:** Build admin dashboard pages in Next.js frontend to view leads and their WhatsApp conversations with authentication guard.

**Details:**

Create /app/admin directory. Create login page at /app/admin/login/page.tsx: form with email/password, call POST /api/auth/login, store JWT in localStorage, redirect to /app/admin. Create auth context provider to manage auth state. Create /app/admin/page.tsx: check JWT (redirect to login if missing), fetch GET /api/leads with pagination, display table with columns (teléfono, nombre, estado, fecha), pagination controls, click row to navigate to /app/admin/leads/[id]. Create /app/admin/leads/[id]/page.tsx: fetch GET /api/leads/{id}, display lead details (all fields), display conversation thread (mensajes sorted by creadoEn, user messages on left, assistant on right, WhatsApp-style UI). Create layout with navigation and logout button. Style with Tailwind CSS (already in project).

**Test Strategy:**

Navigate to /admin without token - should redirect to /admin/login. Login with admin credentials. Verify redirects to /admin and shows leads list. Click a lead, verify shows conversation history. Test pagination on leads list. Test logout clears token and redirects to login. Verify API calls include Authorization header with JWT.
