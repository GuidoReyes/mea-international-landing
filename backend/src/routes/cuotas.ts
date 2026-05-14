import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

// GET /api/cuotas/consolidado?edicionId=&vencidaSolo=
router.get("/consolidado", verifyJWT, async (req: Request, res: Response) => {
  const edicionId = req.query.edicionId ? parseInt(req.query.edicionId as string) : undefined;
  const vencidaSolo = req.query.vencidaSolo === "true";
  const ahora = new Date();

  const where: Record<string, unknown> = { estado: "PENDIENTE" };
  if (vencidaSolo) where.fechaVence = { lt: ahora };

  const cuotas = await prisma.cuotaPago.findMany({
    where,
    include: {
      pago: {
        include: {
          inscripcion: {
            include: { edicion: true },
          },
        },
      },
    },
  });

  // Group by edicionId
  const grupos = new Map<number, { edicionId: number; edicionNombre: string; totalCuotas: number; montoPendiente: number }>();

  for (const cuota of cuotas) {
    const edicion = cuota.pago.inscripcion.edicion;
    if (edicionId !== undefined && edicion.id !== edicionId) continue;

    if (!grupos.has(edicion.id)) {
      grupos.set(edicion.id, {
        edicionId: edicion.id,
        edicionNombre: edicion.nombre,
        totalCuotas: 0,
        montoPendiente: 0,
      });
    }
    const g = grupos.get(edicion.id)!;
    g.totalCuotas++;
    g.montoPendiente = parseFloat((g.montoPendiente + parseFloat(cuota.monto.toString())).toFixed(2));
  }

  res.json(Array.from(grupos.values()));
});

// GET /api/cuotas/pago/:pagoId
router.get("/pago/:pagoId", verifyJWT, async (req: Request, res: Response) => {
  const pagoId = parseInt(req.params["pagoId"] as string);
  if (isNaN(pagoId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const cuotas = await prisma.cuotaPago.findMany({
    where: { pagoId },
    orderBy: { numeroCuota: "asc" },
  });

  res.json(cuotas);
});

// PATCH /api/cuotas/:id — marcar como COMPLETADO
router.patch("/:id", verifyJWT, auditLog("PAGAR_CUOTA", "cuotas"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const cuota = await prisma.cuotaPago.update({
    where: { id },
    data: { estado: "COMPLETADO", pagadoEn: new Date() },
  });

  res.json(cuota);
});

export default router;
