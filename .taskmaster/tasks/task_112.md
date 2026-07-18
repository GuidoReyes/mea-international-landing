# Task ID: 112

**Title:** Seed 7 Rutas with correct assignment matrix

**Status:** done

**Dependencies:** 111 ✓

**Priority:** high

**Description:** Extend seed-curriculum.ts to insert Ruta rows and populate RutaLeccion according to PRD assignment matrix

**Details:**

1. Define 7 Ruta objects in seed-curriculum.ts: general (A1-C1), viajar (A1-A2), restaurantes (A1-A2), talleres (A1-A2), oficina (A2-B1), tecnicos-pc (A2-B1), call-center (B2-C1)
2. Set icono field using lucide-react icon names (Globe, Plane, UtensilsCrossed, Wrench, Briefcase, Monitor, Headset)
3. For `general` Ruta: insert ALL Leccion IDs from A1-C1 curriculum into RutaLeccion, ordered by Capitulo.nivel then Capitulo.orden then Leccion.orden
4. For specialized Rutas (viajar, restaurantes, talleres, oficina, tecnicos-pc, call-center): query Leccion by chapter titulo/keyword matching per PRD matrix rules, insert into RutaLeccion with appropriate orden
5. For talleres and oficina Rutas: also include existing Leccion IDs from `ingles-talleres-mecanicos` and `ingles-de-oficina` CursoOnline
6. Set Ruta.orden: general=1, viajar=2, restaurantes=3, talleres=4, oficina=5, tecnicos-pc=6, call-center=7
7. Mark all 7 Rutas as publicada=true
8. Use upsert by slug to make idempotent

**Test Strategy:**

1. Verify all 7 Rutas created with correct slugs and orden
2. Check general Ruta has ~150-200 RutaLeccion entries (all A1-C1)
3. Verify viajar/restaurantes Rutas only reference A1-A2 lecciones
4. Confirm call-center Ruta includes B2-C1 lecciones
5. Test talleres Ruta includes both general A1-A2 lecciones AND existing talleres-specific lecciones
6. Verify no Leccion is duplicated within same Ruta (composite PK enforces)
7. Run query: SELECT rutaId, COUNT(*) FROM RutaLeccion GROUP BY rutaId - confirm non-zero counts
