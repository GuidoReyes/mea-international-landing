# Task ID: 153

**Title:** Create vocational courses section on landing page

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Add new section displaying 4 vocational course cards (General, Restaurantes, Call Center, Oficina) with CTA to free lessons

**Details:**

Create CursoVocacionalCard component. Add new section to app/page.tsx after hero or before testimonials. Display 4 cards for Inglés General, Restaurantes, Call Center, Oficina. Each card has CTA 'Ver 3 lecciones gratis' → /cursos/{slug} (general, restaurantes, call-center, oficina). Fetch data from getRutas() in lib/rutas.ts or use static slugs. Design should match existing landing aesthetics with brand colors. Responsive: 1-2 cols mobile, 4 cols desktop.

**Test Strategy:**

Verify 4 cards render with correct titles/descriptions, all CTAs link to correct /cursos/{slug} routes, data loaded from getRutas or static config, responsive layout works, matches design system
