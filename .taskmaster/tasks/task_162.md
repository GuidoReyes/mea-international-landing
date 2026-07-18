# Task ID: 162

**Title:** Integrate RegisterModal into lesson gate and login page

**Status:** done

**Dependencies:** 157 ✓, 159 ✓, 160 ✓

**Priority:** medium

**Description:** Use RegisterModal in LeccionClient lesson gate and add registration link to login page

**Details:**

Import and use RegisterModal in: (1) components/cursos-online/LeccionClient.tsx - show when 4th+ lesson accessed without auth, (2) app/alumno/login/page.tsx - add '¿No tenés cuenta? Registrate' link/button that opens RegisterModal. Ensure modal state managed properly (open/close). On successful registration, update auth context/state and refresh curriculum data to unlock lessons. Test both entry points work identically. Ensure proper z-index layering and accessibility (focus trap, ESC to close).

**Test Strategy:**

Test RegisterModal opens from lesson 4+ without login, test modal opens from login page link, verify both instances work identically, test registration from both entry points, verify post-registration state updates (lessons unlock), test modal close behavior, verify accessibility (keyboard nav, focus management)
