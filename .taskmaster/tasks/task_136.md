# Task ID: 136

**Title:** Update navbar navigation to include Planes link

**Status:** done

**Dependencies:** 134 ✓

**Priority:** medium

**Description:** Add 'Planes' navigation item to both desktop and mobile menus in navbar and footer

**Details:**

Edit components/ui/navbar-1.tsx line 9-15: Add { label: 'Planes', href: '#planes' } to navLinks array after the Cursos item (position index 2). This array is used by both desktop nav (line 59) and mobile menu (line 135), so one change updates both. Edit app/page.tsx lines 793-799: Add { label: 'Planes', href: '#planes' } to the inline footer navigation array after Cursos to maintain parity. Verify smooth scroll behavior works for both #cursos and #planes anchors.

**Test Strategy:**

Manual testing: click Planes link in desktop nav, verify smooth scroll to #planes section. Open mobile menu, click Planes, verify scroll and menu closes. Scroll to footer, click Planes link, verify navigation. Test all navigation states (scrolled/not scrolled for navbar, mobile open/closed). Verify no console errors.
