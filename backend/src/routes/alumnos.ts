import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { inscribirEnCursosPublicados } from "../lib/suscripciones";

const router = Router();

const alumnoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  pais: z.string().optional(),
  fechaNacimiento: z.string().datetime().optional(),
  activo: z.boolean().optional(),
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
      suscripciones: {
        include: { planPrecio: { include: { plan: true } } },
        orderBy: { creadoEn: "desc" },
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

// POST /api/alumnos/:id/reset-password — genera contraseña temporal nueva.
// El admin NUNCA ve la contraseña actual (solo existe hasheada); esto la reemplaza.
router.post("/:id/reset-password", verifyJWT, auditLog("RESET_PASSWORD_ALUMNO", "alumnos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { id } });
  if (!alumno) {
    res.status(404).json({ error: "Alumno no encontrado" });
    return;
  }

  const tempPassword = Math.random().toString(36).slice(-10);
  const password = await bcrypt.hash(tempPassword, 10);
  await prisma.alumno.update({
    where: { id },
    data: { password, primerLogin: true },
  });

  res.json({ ok: true, tempPassword });
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

  const { nombre, apellido, whatsapp, pais, fechaNacimiento, activo } = parsed.data;

  const alumno = await prisma.alumno.update({
    where: { id },
    data: {
      nombre,
      apellido,
      whatsapp,
      pais,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
      activo,
    },
  });

  res.json(alumno);
});

// POST /api/alumnos/:id/acceso-manual — el admin otorga o revoca acceso a TODAS las
// lecciones del portal sin pasar por pago. Reusa el mismo concepto de "Suscripcion
// ACTIVA" que ya desbloquea contenido para un alumno que sí pagó (tieneSuscripcionActiva
// en lib/suscripciones.ts) — así el acceso manual funciona en /cursos-online, /rutas y
// /lecciones sin tener que replicar la lógica de gating en cada ruta.
router.post(
  "/:id/acceso-manual",
  verifyJWT,
  auditLog("ACCESO_MANUAL_ALUMNO", "alumnos"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { activar } = req.body as { activar?: boolean };
    if (typeof activar !== "boolean") {
      res.status(400).json({ error: "activar (boolean) es requerido" });
      return;
    }

    const alumno = await prisma.alumno.findUnique({ where: { id } });
    if (!alumno) {
      res.status(404).json({ error: "Alumno no encontrado" });
      return;
    }

    const existente = await prisma.suscripcion.findFirst({
      where: { alumnoId: id, proveedor: "manual_admin" },
      orderBy: { creadoEn: "desc" },
    });

    if (activar) {
      if (existente) {
        await prisma.suscripcion.update({
          where: { id: existente.id },
          data: { estado: "ACTIVA", fechaInicio: new Date(), fechaFin: null },
        });
      } else {
        const planPrecio = await prisma.planPrecio.findFirst({
          where: { plan: { recomendado: true } },
          orderBy: { duracionMeses: "desc" },
        });
        if (!planPrecio) {
          res.status(500).json({ error: "No hay un plan configurado para otorgar acceso manual" });
          return;
        }
        await prisma.suscripcion.create({
          data: {
            alumnoId: id,
            planPrecioId: planPrecio.id,
            estado: "ACTIVA",
            proveedor: "manual_admin",
            fechaInicio: new Date(),
            fechaFin: null,
          },
        });
      }
      await inscribirEnCursosPublicados(id);
    } else if (existente) {
      await prisma.suscripcion.update({
        where: { id: existente.id },
        data: { estado: "CANCELADA" },
      });
    }

    res.json({ ok: true, activar });
  }
);

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
