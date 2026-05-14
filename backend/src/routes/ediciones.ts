import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

const createSchema = z.object({
  cursoId: z.number().int().positive(),
  nombre: z.string().min(1),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  precio: z.number().positive(),
  precioUSD: z.number().positive().optional(),
  cupo: z.number().int().positive().default(20),
  instructor: z.string().optional(),
});

const updateSchema = createSchema.partial();

const inscribirSchema = z.object({
  alumnoId: z.number().int().positive(),
  monto: z.number().positive(),
  moneda: z.enum(["GTQ", "USD"]).default("GTQ"),
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "OTRO"]),
  numeroCuotas: z.number().int().min(1).max(24).default(1),
});

// GET /api/ediciones
router.get("/", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip = (page - 1) * limit;
  const cursoId = req.query.cursoId ? parseInt(req.query.cursoId as string) : undefined;
  const activoParam = req.query.activo as string | undefined;

  const where: Record<string, unknown> = {};
  if (cursoId) where.cursoId = cursoId;
  if (activoParam !== undefined) where.activo = activoParam === "true";

  const [ediciones, total] = await Promise.all([
    prisma.edicion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaInicio: "desc" },
      include: { curso: true, _count: { select: { inscripciones: true } } },
    }),
    prisma.edicion.count({ where }),
  ]);

  res.json({ data: ediciones, meta: { total, page, limit } });
});

// GET /api/ediciones/:id
router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const edicion = await prisma.edicion.findUnique({
    where: { id },
    include: {
      curso: true,
      inscripciones: {
        include: {
          alumno: true,
          pagos: { include: { cuotas: { orderBy: { numeroCuota: "asc" } } } },
        },
      },
    },
  });

  if (!edicion) {
    res.status(404).json({ error: "Edición no encontrada" });
    return;
  }

  res.json(edicion);
});

// POST /api/ediciones
router.post("/", verifyJWT, auditLog("CREAR_EDICION", "ediciones"), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { cursoId, nombre, fechaInicio, fechaFin, precio, precioUSD, cupo, instructor } = parsed.data;

  const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
  if (!curso) {
    res.status(404).json({ error: "Curso no encontrado" });
    return;
  }

  const edicion = await prisma.edicion.create({
    data: {
      cursoId,
      nombre,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      precio,
      precioUSD,
      cupo,
      instructor,
    },
    include: { curso: true },
  });

  res.status(201).json(edicion);
});

// PATCH /api/ediciones/:id
router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_EDICION", "ediciones"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { cursoId, nombre, fechaInicio, fechaFin, precio, precioUSD, cupo, instructor } = parsed.data;

  if (cursoId) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) {
      res.status(404).json({ error: "Curso no encontrado" });
      return;
    }
  }

  const edicion = await prisma.edicion.update({
    where: { id },
    data: {
      ...(cursoId && { cursoId }),
      ...(nombre && { nombre }),
      ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
      ...(fechaFin && { fechaFin: new Date(fechaFin) }),
      ...(precio !== undefined && { precio }),
      ...(precioUSD !== undefined && { precioUSD }),
      ...(cupo !== undefined && { cupo }),
      ...(instructor !== undefined && { instructor }),
    },
  });

  res.json(edicion);
});

// DELETE /api/ediciones/:id (soft delete)
router.delete("/:id", verifyJWT, auditLog("ELIMINAR_EDICION", "ediciones"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await prisma.edicion.update({ where: { id }, data: { activo: false } });
  res.status(204).send();
});

// POST /api/ediciones/:id/inscribir
router.post(
  "/:id/inscribir",
  verifyJWT,
  auditLog("INSCRIBIR_ALUMNO", "inscripciones"),
  async (req: Request, res: Response) => {
    const edicionId = parseInt(req.params["id"] as string);
    if (isNaN(edicionId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const parsed = inscribirSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { alumnoId, monto, moneda, metodo, numeroCuotas } = parsed.data;

    try {
      const inscripcion = await prisma.$transaction(async (tx) => {
        const edicion = await tx.edicion.findUnique({ where: { id: edicionId } });
        if (!edicion) throw new Error("Edición no encontrada");

        const alumno = await tx.alumno.findUnique({ where: { id: alumnoId } });
        if (!alumno) throw new Error("Alumno no encontrado");

        const ins = await tx.inscripcion.create({
          data: { alumnoId, edicionId, estado: "ACTIVA" },
        });

        const pago = await tx.pago.create({
          data: { inscripcionId: ins.id, monto, moneda, metodo, estado: "PENDIENTE" },
        });

        if (numeroCuotas > 1) {
          const montoCuota = Math.round((monto / numeroCuotas) * 100) / 100;
          const hoy = new Date();

          await tx.cuotaPago.createMany({
            data: Array.from({ length: numeroCuotas }, (_, i) => {
              const fechaVence = new Date(hoy);
              fechaVence.setMonth(fechaVence.getMonth() + i);
              return { pagoId: pago.id, numeroCuota: i + 1, monto: montoCuota, fechaVence, estado: "PENDIENTE" };
            }),
          });
        }

        return tx.inscripcion.findUnique({
          where: { id: ins.id },
          include: { alumno: true, edicion: true, pagos: { include: { cuotas: true } } },
        });
      });

      res.status(201).json(inscripcion);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al inscribir";
      res.status(400).json({ error: msg });
    }
  }
);

export default router;
