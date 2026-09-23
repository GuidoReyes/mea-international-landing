import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { parseDateFilter } from "../lib/date-utils";

const router = Router();

const patchSchema = z.object({
  estado: z.enum(["PENDIENTE", "COMPLETADO", "RECHAZADO", "REEMBOLSADO"]).optional(),
  referencia: z.string().optional(),
});

// vuln_034: filtros del GET, sin validar antes de esta tarea. VENCIDO se incluye
// acá (a diferencia de patchSchema) porque es un estado legítimo para filtrar —
// solo el scheduler lo asigna (scheduler.ts), no es algo que un PATCH deba poder
// setear a mano.
export const ESTADOS_PAGO = ["PENDIENTE", "COMPLETADO", "RECHAZADO", "REEMBOLSADO", "VENCIDO"] as const;
export const MONEDAS = ["GTQ", "USD"] as const;
export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "OTRO"] as const;

// GET /api/pagos
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;

  const { estado, moneda, metodo, fechaDesde, fechaHasta } = req.query as Record<string, string | undefined>;

  const desde = parseDateFilter(fechaDesde);
  const hasta = parseDateFilter(fechaHasta);
  if (!desde.valid || !hasta.valid) {
    res.status(400).json({ error: "fechaDesde/fechaHasta inválidas — usá formato ISO (YYYY-MM-DD)" });
    return;
  }
  if (estado !== undefined && !(ESTADOS_PAGO as readonly string[]).includes(estado)) {
    res.status(400).json({ error: `estado inválido. Valores: ${ESTADOS_PAGO.join(", ")}` });
    return;
  }
  if (moneda !== undefined && !(MONEDAS as readonly string[]).includes(moneda)) {
    res.status(400).json({ error: `moneda inválida. Valores: ${MONEDAS.join(", ")}` });
    return;
  }
  if (metodo !== undefined && !(METODOS_PAGO as readonly string[]).includes(metodo)) {
    res.status(400).json({ error: `metodo inválido. Valores: ${METODOS_PAGO.join(", ")}` });
    return;
  }

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (moneda) where.moneda = moneda;
  if (metodo) where.metodo = metodo;
  if (desde.date || hasta.date) {
    where.creadoEn = {
      ...(desde.date ? { gte: desde.date } : {}),
      ...(hasta.date ? { lte: hasta.date } : {}),
    };
  }

  const [pagos, total] = await Promise.all([
    prisma.pago.findMany({
      where,
      skip,
      take: limit,
      orderBy: { creadoEn: "desc" },
      include: { inscripcion: { include: { alumno: true, edicion: true } } },
    }),
    prisma.pago.count({ where }),
  ]);

  res.json({ data: pagos, meta: { total, page, limit } });
});

// GET /api/pagos/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      inscripcion: { include: { alumno: true, edicion: true } },
      cuotas: { orderBy: { numeroCuota: "asc" } },
    },
  });

  if (!pago) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }

  res.json(pago);
});

// PATCH /api/pagos/:id
router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_PAGO", "pagos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const pago = await prisma.pago.update({
    where: { id },
    data: parsed.data,
  });

  res.json(pago);
});

export default router;
