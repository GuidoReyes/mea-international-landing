# Task ID: 111

**Title:** Create comprehensive A1-C1 curriculum seed script

**Status:** done

**Dependencies:** 110 ✓

**Priority:** high

**Description:** Build seed-curriculum.ts with complete temario from A1 to C1 as specified in PRD tables

**Details:**

1. Create `backend/src/scripts/seed-curriculum.ts` following pattern of seed-cursos-online.ts
2. Find/update existing `ingles-general-a1` CursoOnline → rename slug to `ingles-general`, update titulo to "Inglés General" (preserve ID for InscripcionOnline integrity)
3. For each A1-C1 table row in PRD: parse "Lecciones clave" column (split by comma/semicolon) into individual Leccion objects
4. Generate Capitulo with `nivel` field set per table section (A1/A2/B1/B2/C1)
5. For each Leccion: generate kebab-case slug from English title (ascii, unique within chapter), set titulo from Spanish title, urlContenido=null initially, orden from position
6. Upsert by slug (idempotent) - if Capitulo slug exists, skip or update; if Leccion slug exists within Capitulo, skip
7. Insert ALL chapters under `ingles-general` CursoOnline (not creating new courses)
8. Keep existing `ingles-talleres-mecanicos` and `ingles-de-oficina` untouched (referenced by existing inscriptions)
9. Use Prisma upsert pattern to make script re-runnable without duplicating data

**Test Strategy:**

1. Run seed twice, verify no duplicate Capitulo/Leccion rows created
2. Count total Leccion rows matches expected count from PRD tables (approximately 150-200 lecciones A1-C1)
3. Verify each Capitulo has correct nivel field (A1/A2/B1/B2/C1)
4. Confirm ingles-general CursoOnline ID unchanged, slug updated from ingles-general-a1
5. Verify existing talleres/oficina courses remain untouched
6. Test Leccion slugs are unique, kebab-case, ascii-only
