import { Router, Request, Response } from "express";
import { z } from "zod";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

const egresoSchema = z.object({
  concepto: z.string().min(1),
  monto: z.number().positive(),
  moneda: z.enum(["GTQ", "USD"]).default("GTQ"),
  categoria: z.enum(["SALARIO", "COMISION", "OPERATIVO", "MARKETING"]),
  fecha: z.string().datetime(),
  nota: z.string().optional(),
});

// GET /api/finanzas/egresos
router.get("/egresos", verifyJWT, async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip  = (page - 1) * limit;
  const categoria = req.query.categoria as string | undefined;
  const mes   = req.query.mes as string | undefined; // YYYY-MM

  const where: Record<string, unknown> = {};
  if (categoria) where.categoria = categoria;
  if (mes) {
    const ref = parseISO(`${mes}-01`);
    where.fecha = { gte: startOfMonth(ref), lte: endOfMonth(ref) };
  }

  const [egresos, total] = await Promise.all([
    prisma.egreso.findMany({ where, skip, take: limit, orderBy: { fecha: "desc" } }),
    prisma.egreso.count({ where }),
  ]);

  res.json({ data: egresos, meta: { total, page, limit } });
});

// POST /api/finanzas/egresos
router.post("/egresos", verifyJWT, auditLog("CREAR_EGRESO", "finanzas"), async (req: Request, res: Response) => {
  const parsed = egresoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }
  const { fecha, ...rest } = parsed.data;
  const egreso = await prisma.egreso.create({
    data: { ...rest, fecha: new Date(fecha) },
  });
  res.status(201).json(egreso);
});

// PATCH /api/finanzas/egresos/:id
router.patch("/egresos/:id", verifyJWT, auditLog("ACTUALIZAR_EGRESO", "finanzas"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = egresoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }
  const { fecha, ...rest } = parsed.data;
  const egreso = await prisma.egreso.update({
    where: { id },
    data: { ...rest, ...(fecha ? { fecha: new Date(fecha) } : {}) },
  });
  res.json(egreso);
});

// DELETE /api/finanzas/egresos/:id
router.delete("/egresos/:id", verifyJWT, auditLog("ELIMINAR_EGRESO", "finanzas"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  await prisma.egreso.delete({ where: { id } });
  res.status(204).send();
});

// GET /api/finanzas/reconciliacion?mes=YYYY-MM
router.get("/reconciliacion", verifyJWT, async (req: Request, res: Response) => {
  const mes = req.query.mes as string | undefined;

  let fechaWhere: Record<string, unknown> = {};
  if (mes) {
    const ref = parseISO(`${mes}-01`);
    fechaWhere = { gte: startOfMonth(ref), lte: endOfMonth(ref) };
  }

  const pagos = await prisma.pago.findMany({
    where: { estado: "COMPLETADO", ...(mes ? { creadoEn: fechaWhere } : {}) },
    select: { metodo: true, monto: true, moneda: true },
  });

  const metodos: Record<string, { metodo: string; totalGTQ: number; totalUSD: number }> = {};
  for (const p of pagos) {
    if (!metodos[p.metodo]) metodos[p.metodo] = { metodo: p.metodo, totalGTQ: 0, totalUSD: 0 };
    if (p.moneda === "GTQ") metodos[p.metodo].totalGTQ += Number(p.monto);
    else metodos[p.metodo].totalUSD += Number(p.monto);
  }

  const result = Object.values(metodos).map((m) => ({
    ...m,
    totalGTQ: Math.round(m.totalGTQ * 100) / 100,
    totalUSD: Math.round(m.totalUSD * 100) / 100,
  }));

  res.json(result);
});

export default router;
