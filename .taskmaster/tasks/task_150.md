# Task ID: 150

**Title:** Implement 5-level English tier section on landing page

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Replace current 3-card level section with 5 compact cards (A1-C1) linking to /planes with nivel query param

**Details:**

Create new NivelCard component displaying 5 English proficiency levels (A1 Principiante, A2 Elemental, B1 Intermedio, B2 Intermedio Alto, C1 Avanzado) with copy from PRD table. Each card links to /planes?nivel={level}. Store card data in content/site.json under new 'niveles[]' key. Update app/page.tsx to render these cards instead of current EvervaultCard levels. Responsive: 1 column mobile, 5 columns desktop. Use brand colors #0A2540/#00C4B4. Reference existing pill styling patterns.

**Test Strategy:**

Verify 5 cards render correctly, all CTAs link to /planes with correct nivel param, responsive layout works on mobile/desktop, brand colors applied correctly, content/site.json correctly stores nivel data
