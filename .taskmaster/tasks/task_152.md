# Task ID: 152

**Title:** Fix dead buttons in Feature108 component

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Update all 3 button CTAs in shadcnblocks-com-feature108.tsx to navigate to proper routes

**Details:**

In components/ui/shadcnblocks-com-feature108.tsx, replace Button components with Link from next/link. Map buttons: 'Inscríbete Ahora' (×2) → /planes, 'Ver Testimonios' → #testimonios anchor. Also fix href='#' for Política de Privacidad link in cookie modal (app/page.tsx) - either open LegalModal for privacy or remove link entirely. Ensure all navigation works client-side without page reload.

**Test Strategy:**

Click all 3 buttons in Feature108 section and verify navigation, test Política de Privacidad link in cookie modal, verify no href='#' remain, test on mobile and desktop
