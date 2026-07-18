# Task ID: 138

**Title:** Production build validation and final QA

**Status:** done

**Dependencies:** 133 ✓, 134 ✓, 135 ✓, 136 ✓, 137 ✓

**Priority:** high

**Description:** Run full production build, verify all acceptance criteria, and conduct final visual review before deployment

**Details:**

Execute production build: 'npm run build' and verify no TypeScript errors, no build warnings, successful compilation. Start production server: 'npm start' and conduct full QA checklist: 1) #cursos section shows NO Quetzal amounts (Q250, Q300, Q1,600 removed), 2) #planes section exists with exactly 2 cards (Plataforma Q150/mes, Plataforma + Grupos Q300/mes), 3) Q300 plan has 'Más popular' badge, 4) Q100 inscription badge displays with 'pago único' label, 5) Disclaimer clearly explains one-time inscription payment, 6) All WhatsApp CTAs work with correct number (+50256311728), 7) Nav (desktop, mobile, footer) includes working #cursos and #planes links, 8) Responsive: cards stack properly on mobile. Test complete user journey: land on page → scroll to cursos → scroll to planes → click plan CTA → WhatsApp opens with pre-filled message. Use Lighthouse to verify no performance/accessibility regressions. Document any edge cases or browser-specific issues.

**Test Strategy:**

Automated: Run 'next build' and verify exit code 0. Run 'next lint' and verify no errors. Manual QA: Complete acceptance criteria checklist from PRD section 2. Test in Chrome, Firefox, Safari. Test on real mobile device (iOS/Android). Run Lighthouse audit - target scores: Performance >90, Accessibility >95. Compare live production site (mea.edu.gt) before/after to verify no unintended changes to other sections (testimonios, FAQ, hero, footer content).
