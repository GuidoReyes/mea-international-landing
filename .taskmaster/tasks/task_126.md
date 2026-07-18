# Task ID: 126

**Title:** Create live class public API endpoint for schedule

**Status:** done

**Dependencies:** 123 ✓, 125 ✓

**Priority:** high

**Description:** Implement GET /api/clases-en-vivo/horario endpoint with liveNow and nextClass calculations

**Details:**

Create `backend/src/routes/clases-en-vivo.ts` starting with the public endpoint:

```typescript
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { obtenerAhoraGuatemala, obtenerClasesEnVivo, obtenerProximaClase } from "../lib/horario-clases";

const router = Router();

// Public endpoint: full weekly schedule + current live classes + next class
router.get("/horario", async (req: Request, res: Response) => {
  const grupos = await prisma.grupoClaseEnVivo.findMany({
    where: { activo: true },
    include: { horarios: true },
    orderBy: { nombre: "asc" }
  });
  
  const ahora = obtenerAhoraGuatemala();
  const liveNow = obtenerClasesEnVivo(grupos, ahora);
  const nextClass = obtenerProximaClase(grupos, ahora);
  
  // CRITICAL: Never include urlZoom in public response
  const horarioSemanal = grupos.map(g => ({
    id: g.id,
    slug: g.slug,
    nombre: g.nombre,
    audiencia: g.audiencia,
    niveles: g.niveles,
    descripcion: g.descripcion,
    profesor: g.profesor,
    duracionMinutos: g.duracionMinutos,
    horarios: g.horarios.map(h => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio
    }))
  }));
  
  res.json({
    horarioSemanal,
    liveNow,
    nextClass
  });
});

export default router;
```

Mount in `backend/src/index.ts`:
```typescript
import clasesEnVivoRoutes from "./routes/clases-en-vivo";
app.use("/api/clases-en-vivo", clasesEnVivoRoutes);
```

Ensure urlZoom is explicitly filtered out in the response mapping.

**Test Strategy:**

Test with: `curl http://localhost:3001/api/clases-en-vivo/horario | jq`. Verify: (1) Response includes horarioSemanal with 8 groups, (2) liveNow is empty array when no class is live, (3) nextClass shows upcoming class with correct minutosHasta, (4) CRITICAL: urlZoom field does NOT appear anywhere in response JSON.
