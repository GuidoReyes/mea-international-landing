# Task ID: 36

**Title:** Add CSV export button to admin leads page

**Status:** done

**Dependencies:** 35 ✓

**Priority:** low

**Description:** Add UI button in frontend that triggers CSV download with active filters

**Details:**

In app/admin/page.tsx, add a button next to the result count (around line 129-133). Import Download icon from lucide-react. Button text 'Exportar CSV', icon Download. onClick handler: construct URL /api/leads/export/csv with current query params (estadoFilter if set). Use window.open(url, '_blank') to trigger download. Include JWT token in URL as query param ?token=... (read from localStorage) OR better: use fetch() with Authorization header, convert response to blob, create object URL, trigger download with temporary <a> element. Second approach more secure.

**Test Strategy:**

Filter leads by estado, click Export CSV, verify file downloads with correct filtered data. Test with no filters exports all. Verify filename has current date.
