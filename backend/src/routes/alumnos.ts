import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

const alumnoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  pais: z.string().optional(),
  fechaNacimiento: z.string().datetime().optional(),
});

const alumnoPatchSchema = alumnoSchema.partial().omit({ email: true });

async function generarCarnet(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.alumno.count({
    where: { carnet: { startsWith: `MEA-${year}-` } },
  });
  return `MEA-${year}-${String(count + 1).padStart(4, "0")}`;
}

// GET /api/alumnos
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const activoParam = req.query.activo as string | undefined;

  const where: Record<string, unknown> = {};
  if (activoParam !== undefined) where.activo = activoParam === "true";
  if (search) {
    where.OR = [
      { nombre: { contains: search } },
      { apellido: { contains: search } },
      { email: { contains: search } },
      { carnet: { contains: search } },
    ];
  }

  const [alumnos, total] = await Promise.all([
    prisma.alumno.findMany({
      where,
      skip,
      take: limit,
      orderBy: { creadoEn: "desc" },
      include: { _count: { select: { inscripciones: true } } },
    }),
    prisma.alumno.count({ where }),
  ]);

  res.json({ data: alumnos, meta: { total, page, limit } });
});

// GET /api/alumnos/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const alumno = await prisma.alumno.findUnique({
    where: { id },
    include: {
      inscripciones: {
        include: { edicion: true, pagos: true },
      },
    },
  });

  if (!alumno) {
    res.status(404).json({ error: "Alumno no encontrado" });
    return;
  }

  res.json(alumno);
});

// POST /api/alumnos
router.post("/", verifyJWT, auditLog("CREAR_ALUMNO", "alumnos"), async (req: Request, res: Response) => {
  const parsed = alumnoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { nombre, apellido, email, whatsapp, pais, fechaNacimiento } = parsed.data;
  const carnet = await generarCarnet();
  const tempPassword = Math.random().toString(36).slice(-10);
  const password = await bcrypt.hash(tempPassword, 10);

  const alumno = await prisma.alumno.create({
    data: {
      carnet,
      nombre,
      apellido,
      email,
      whatsapp,
      pais,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
      password,
    },
  });

  res.status(201).json({ ...alumno, tempPassword });
});

// PATCH /api/alumnos/:id
router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_ALUMNO", "alumnos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = alumnoPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { nombre, apellido, whatsapp, pais, fechaNacimiento } = parsed.data;

  const alumno = await prisma.alumno.update({
    where: { id },
    data: {
      nombre,
      apellido,
      whatsapp,
      pais,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
    },
  });

  res.json(alumno);
});

// DELETE /api/alumnos/:id (soft delete)
router.delete("/:id", verifyJWT, auditLog("ELIMINAR_ALUMNO", "alumnos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await prisma.alumno.update({ where: { id }, data: { activo: false } });
  res.status(204).send();
});

export default router;
