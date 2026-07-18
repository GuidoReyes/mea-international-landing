# Task ID: 128

**Title:** Implement admin CRUD endpoints for live class groups

**Status:** done

**Dependencies:** 126 ✓

**Priority:** medium

**Description:** Add admin-protected POST, PATCH endpoints for creating and editing live class groups in same clases-en-vivo.ts file

**Details:**

Extend `backend/src/routes/clases-en-vivo.ts` with admin endpoints following the pattern from `routes/cursos.ts` (verifyJWT + auditLog in same file):

```typescript
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

// Admin: Create new live class group
router.post("/", verifyJWT, auditLog("CREAR_GRUPO_CLASE", "clases-en-vivo"), async (req: Request, res: Response) => {
  const { slug, nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos } = req.body as {
    slug?: string;
    nombre?: string;
    audiencia?: string;
    niveles?: string;
    descripcion?: string;
    profesor?: string;
    urlZoom?: string;
    duracionMinutos?: number;
  };
  
  if (!slug || !nombre || !audiencia || !niveles) {
    res.status(400).json({ error: "Faltan campos requeridos: slug, nombre, audiencia, niveles" });
    return;
  }
  
  const grupo = await prisma.grupoClaseEnVivo.create({
    data: {
      slug,
      nombre,
      audiencia,
      niveles,
      descripcion,
      profesor,
      urlZoom: urlZoom ?? "https://zoom.us/j/PENDIENTE",
      duracionMinutos: duracionMinutos ?? 60,
      activo: true
    }
  });
  
  res.status(201).json(grupo);
});

// Admin: Update live class group (including urlZoom)
router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_GRUPO_CLASE", "clases-en-vivo"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  
  const { nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos, activo } = req.body as {
    nombre?: string;
    audiencia?: string;
    niveles?: string;
    descripcion?: string;
    profesor?: string;
    urlZoom?: string;
    duracionMinutos?: number;
    activo?: boolean;
  };
  
  const grupo = await prisma.grupoClaseEnVivo.update({
    where: { id },
    data: { nombre, audiencia, niveles, descripcion, profesor, urlZoom, duracionMinutos, activo }
  });
  
  res.json(grupo);
});

// Admin: Add schedule to group
router.post("/:id/horarios", verifyJWT, auditLog("AGREGAR_HORARIO", "clases-en-vivo"), async (req: Request, res: Response) => {
  const grupoId = parseInt(req.params["id"] as string);
  if (isNaN(grupoId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  
  const { diaSemana, horaInicio } = req.body as { diaSemana?: number; horaInicio?: string };
  
  if (diaSemana === undefined || !horaInicio) {
    res.status(400).json({ error: "Faltan campos: diaSemana, horaInicio" });
    return;
  }
  
  if (diaSemana < 0 || diaSemana > 6) {
    res.status(400).json({ error: "diaSemana debe estar entre 0 (domingo) y 6 (sábado)" });
    return;
  }
  
  // Validate time format HH:mm
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio)) {
    res.status(400).json({ error: "horaInicio debe tener formato HH:mm (24h)" });
    return;
  }
  
  const horario = await prisma.horarioClase.create({
    data: { grupoId, diaSemana, horaInicio }
  });
  
  res.status(201).json(horario);
});
```

These endpoints allow Guido to manage live class groups from admin panel without touching code, including editing Zoom URLs when available.

**Test Strategy:**

Test with admin JWT token: (1) POST /api/clases-en-vivo creates new group, (2) PATCH /api/clases-en-vivo/1 updates urlZoom successfully, (3) POST /api/clases-en-vivo/1/horarios adds schedule with validation, (4) Invalid diaSemana or horaInicio format returns 400, (5) All actions create audit log entries via auditLog middleware.
