# Task ID: 132

**Title:** Run all seeds and verify database state

**Status:** done

**Dependencies:** 122 ✓

**Priority:** medium

**Description:** Execute seed:clases-en-vivo script and verify all 8 groups, 16 schedules, and Plan updates are correct

**Details:**

Execute the complete seeding workflow:

1. Run Prisma migration:
   ```bash
   cd backend
   npx prisma migrate dev --name agregar-clases-en-vivo
   npx prisma generate
   ```

2. Run the seed script:
   ```bash
   npm run seed:clases-en-vivo
   ```

3. Verify with Prisma Studio:
   ```bash
   npx prisma studio
   ```
   
   Check:
   - GrupoClaseEnVivo table has exactly 8 records
   - Slugs match: basic-ninos, basico-2-adolescentes, advance-conversacional, basic-adultos, starters, cubs, smarties, adults
   - HorarioClase table has exactly 16 records (2 per group)
   - All urlZoom fields are "https://zoom.us/j/PENDIENTE"
   - All duracionMinutos are 60
   - Plan table: "profesional" has incluyeClasesEnVivo=true, "esencial" has incluyeClasesEnVivo=false

4. Test idempotency: run `npm run seed:clases-en-vivo` again and verify no duplicates are created and no errors occur.

**Test Strategy:**

Seed script completes without errors. Prisma Studio shows exactly 8 groups and 16 schedules with correct data. Running seed twice produces same result (idempotent). Plan "profesional" correctly updated.
