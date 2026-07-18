# Task ID: 115

**Title:** Create lib/rutas.ts frontend fetcher functions

**Status:** done

**Dependencies:** 114 ✓

**Priority:** medium

**Description:** Build frontend fetcher module matching lib/cursos-online.ts pattern for server components

**Details:**

1. Create `lib/rutas.ts` with TypeScript interfaces: RutaResumen, RutaCurriculum, CapituloRuta, LeccionRuta
2. Implement getRutas(): Promise<RutaResumen[]> fetcher hitting GET /api/rutas with ISR revalidation (same REVALIDATE_SECONDS as cursos-online)
3. Implement getRutaCurriculum(slug: string): Promise<RutaCurriculum | null> hitting GET /api/rutas/:slug/curriculum
4. Use same error handling pattern as cursos-online.ts (return [] or null on error, don't throw)
5. Match TypeScript interfaces exactly to backend response shape
6. Export nivel badge color helper: getNivelBadgeColor(nivelMin, nivelMax) → returns tailwind classes (green for A1-A2, amber for B1-B2, red if includes C1) using MEA colors #0A2540/#00C4B4
7. No client-side state management needed (server components only)

**Test Strategy:**

1. Test getRutas() in Next.js dev server, verify 7 Rutas returned
2. Test getRutaCurriculum('general'), verify A1-C1 curriculum structure
3. Test getRutaCurriculum('viajar'), verify only A1-A2 lecciones
4. Test error handling: pass invalid slug, verify returns null without throwing
5. Verify TypeScript types match backend response (no any types)
6. Test getNivelBadgeColor helper returns correct color for each Ruta
