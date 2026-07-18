# Task ID: 155

**Title:** Implement lesson gate for 4th+ lessons without session

**Status:** done

**Dependencies:** 154 ✓

**Priority:** high

**Description:** Show RegisterModal instead of lock screen when unauthenticated user reaches 4th+ lesson

**Details:**

In components/cursos-online/LeccionClient.tsx, modify gating logic. Currently uses esGratis/subscription check. For 4th+ lesson without session (no getAlumnoToken()), instead of showing Lock screen, render RegisterModal component with copy 'Desbloqueá el resto de la ruta creando tu cuenta gratis'. Create RegisterModal component if doesn't exist (check for existing auth modals first). Modal should have dual registration options (email or WhatsApp). Ensure first 3 lessons remain freely accessible without any modal.

**Test Strategy:**

Test in incognito: lessons 1-3 play without login, lesson 4+ shows RegisterModal, modal has correct copy, both registration paths visible, successful registration grants access, logged-in users see no gate
