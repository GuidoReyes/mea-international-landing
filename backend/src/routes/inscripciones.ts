import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ESTADOS_VALIDOS = ["ACTIVA", "COMPLETADA", "CANCELADA", "SUSPENDIDA"] as const;

const csvRowSchema = z.object({
  carnet_o_email: z.string().min(1),
  edicion_id: z.string().regex(/^\d+$/, "edicion_id debe ser número"),
  monto: z.string().regex(/^\d+(\.\d{1,2})?$/, "monto inválido"),
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "OTRO"]),
});

// GET /api/inscripciones
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;

  const { estado, alumnoId, edicionId } = req.query as Record<string, string | undefined>;

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (alumnoId) where.alumnoId = parseInt(alumnoId);
  if (edicionId) where.edicionId = parseInt(edicionId);

  const [inscripciones, total] = await Promise.all([
    prisma.inscripcion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { creadoEn: "desc" },
      include: {
        alumno: true,
        edicion: { include: { curso: true } },
        _count: { select: { pagos: true } },
      },
    }),
    prisma.inscripcion.count({ where }),
  ]);

  res.json({ data: inscripciones, meta: { total, page, limit } });
});

// GET /api/inscripciones/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const inscripcion = await prisma.inscripcion.findUnique({
    where: { id },
    include: {
      alumno: true,
      edicion: { include: { curso: true } },
      pagos: { include: { cuotas: { orderBy: { numeroCuota: "asc" } } } },
    },
  });

  if (!inscripcion) {
    res.status(404).json({ error: "Inscripción no encontrada" });
    return;
  }

  res.json(inscripcion);
});

// PATCH /api/inscripciones/:id
router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_INSCRIPCION", "inscripciones"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { estado } = req.body as { estado?: string };
  if (!estado || !(ESTADOS_VALIDOS as readonly string[]).includes(estado)) {
    res.status(400).json({ error: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(", ")}` });
    return;
  }

  const inscripcion = await prisma.inscripcion.update({
    where: { id },
    data: { estado: estado as "ACTIVA" | "COMPLETADA" | "CANCELADA" | "SUSPENDIDA" },
  });

  res.json(inscripcion);
});

// POST /api/inscripciones/importar-csv
router.post(
  "/importar-csv",
  verifyJWT,
  auditLog("IMPORTAR_CSV_INSCRIPCIONES", "inscripciones"),
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "Se requiere un archivo CSV" });
      return;
    }

    const text = req.file.buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      res.status(400).json({ error: "CSV vacío o sin filas de datos" });
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["carnet_o_email", "edicion_id", "monto", "metodo"];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      res.status(400).json({ error: `Columnas faltantes: ${missing.join(", ")}` });
      return;
    }

    const exitosos: number[] = [];
    const errores: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const values = lines[i].split(",").map((v) => v.trim());
      const raw = Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? ""]));

      const parsed = csvRowSchema.safeParse(raw);
      if (!parsed.success) {
        errores.push({ row: rowNum, error: parsed.error.issues.map((e) => e.message).join("; ") });
        continue;
      }

      const { carnet_o_email, edicion_id, monto, metodo } = parsed.data;

      try {
        await prisma.$transaction(async (tx) => {
          const alumno = await tx.alumno.findFirst({
            where: { OR: [{ carnet: carnet_o_email }, { email: carnet_o_email }] },
          });
          if (!alumno) throw new Error(`Alumno '${carnet_o_email}' no encontrado`);

          const edicion = await tx.edicion.findUnique({ where: { id: parseInt(edicion_id) } });
          if (!edicion) throw new Error(`Edición ${edicion_id} no encontrada`);

          const ins = await tx.inscripcion.create({
            data: { alumnoId: alumno.id, edicionId: edicion.id, estado: "ACTIVA" },
          });

          await tx.pago.create({
            data: {
              inscripcionId: ins.id,
              monto: parseFloat(monto),
              moneda: "GTQ",
              metodo: metodo as "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "DEPOSITO" | "OTRO",
              estado: "PENDIENTE",
            },
          });

          exitosos.push(ins.id);
        });
      } catch (err) {
        errores.push({ row: rowNum, error: err instanceof Error ? err.message : "Error desconocido" });
      }
    }

    res.json({
      exitosos: exitosos.length,
      errores,
      inscripcionesCreadas: exitosos,
    });
  }
);

export default router;
