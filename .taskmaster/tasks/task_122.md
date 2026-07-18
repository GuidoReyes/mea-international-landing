# Task ID: 122

**Title:** Create seed script for live class groups and schedules

**Status:** done

**Dependencies:** 121 ✓

**Priority:** high

**Description:** Implement backend/src/scripts/seed-clases-en-vivo.ts following the idempotent upsert pattern from seed-cursos-online.ts

**Details:**

Create `backend/src/scripts/seed-clases-en-vivo.ts` following the exact pattern from `seed-cursos-online.ts` (static arrays with upsert by slug, idempotent).

Define the 8 groups and 16 schedules as specified in the PRD table:

```typescript
import prisma from "../lib/prisma";

const GRUPOS = [
  {
    slug: "basic-ninos",
    nombre: "Basic Niños",
    audiencia: "ninos",
    niveles: "A1",
    descripcion: null,
    profesor: null,
    urlZoom: "https://zoom.us/j/PENDIENTE",
    duracionMinutos: 60,
    horarios: [{ diaSemana: 1, horaInicio: "17:00" }, { diaSemana: 3, horaInicio: "17:00" }]
  },
  {
    slug: "basico-2-adolescentes",
    nombre: "Básico 2 Adolescentes",
    audiencia: "adolescentes",
    niveles: "A2",
    descripcion: null,
    profesor: null,
    urlZoom: "https://zoom.us/j/PENDIENTE",
    duracionMinutos: 60,
    horarios: [{ diaSemana: 1, horaInicio: "18:20" }, { diaSemana: 3, horaInicio: "18:20" }]
  },
  // ... continue for all 8 groups as per PRD table
];

async function main() {
  for (const grupo of GRUPOS) {
    const { horarios, ...grupoData } = grupo;
    const created = await prisma.grupoClaseEnVivo.upsert({
      where: { slug: grupo.slug },
      update: grupoData,
      create: grupoData
    });
    
    // Delete old schedules and recreate (simplest idempotent approach)
    await prisma.horarioClase.deleteMany({ where: { grupoId: created.id } });
    for (const h of horarios) {
      await prisma.horarioClase.create({
        data: { grupoId: created.id, diaSemana: h.diaSemana, horaInicio: h.horaInicio }
      });
    }
  }
  
  // Update Plan "profesional" to incluyeClasesEnVivo: true
  await prisma.plan.update({
    where: { slug: "profesional" },
    data: { incluyeClasesEnVivo: true }
  });
  
  console.log("✓ Seeded 8 live class groups with 16 schedules");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Add script to package.json:
```json
"seed:clases-en-vivo": "ts-node src/scripts/seed-clases-en-vivo.ts"
```

**Test Strategy:**

Run `npm run seed:clases-en-vivo` multiple times (idempotent test). Verify with Prisma Studio: 8 GrupoClaseEnVivo records exist with correct slugs, 16 HorarioClase records (2 per group), and Plan "profesional" has incluyeClasesEnVivo=true. Re-run should not create duplicates or error.
