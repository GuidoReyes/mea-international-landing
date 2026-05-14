import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

const etapaSchema = z.object({
  etapaId: z.number().int().positive(),
});

const leadCrmSchema = z.object({
  valorEstimado: z.number().positive().optional(),
  fechaCierreEstimada: z.string().datetime().optional(),
  notasCRM: z.string().optional(),
  asignadoAdminId: z.number().int().positive().optional(),
});

// GET /api/crm/pipeline
router.get("/pipeline", verifyJWT, async (_req: Request, res: Response) => {
  const etapas = await prisma.cRMEtapa.findMany({
    orderBy: { orden: "asc" },
    include: {
      leads: {
        where: { estado: { not: "inactivo" } },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          email: true,
          valorEstimado: true,
          creadoEn: true,
          asignadoAdminId: true,
          asignadoAdmin: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  res.json(etapas);
});

// GET /api/crm/etapas
router.get("/etapas", verifyJWT, async (_req: Request, res: Response) => {
  const etapas = await prisma.cRMEtapa.findMany({ orderBy: { orden: "asc" } });
  res.json(etapas);
});

// GET /api/crm/stats
router.get("/stats", verifyJWT, async (_req: Request, res: Response) => {
  const etapas = await prisma.cRMEtapa.findMany({ orderBy: { orden: "asc" } });

  const stats = await Promise.all(
    etapas.map(async (etapa) => {
      const [countLeads, aggregate] = await Promise.all([
        prisma.lead.count({ where: { etapaId: etapa.id } }),
        prisma.lead.aggregate({
          where: { etapaId: etapa.id },
          _sum: { valorEstimado: true },
        }),
      ]);
      return {
        etapaId: etapa.id,
        nombre: etapa.nombre,
        color: etapa.color,
        orden: etapa.orden,
        countLeads,
        sumValorEstimado: aggregate._sum.valorEstimado ?? 0,
      };
    })
  );

  res.json(stats);
});

// PATCH /api/crm/leads/:id/etapa
router.patch(
  "/leads/:id/etapa",
  verifyJWT,
  auditLog("MOVER_LEAD_ETAPA", "crm"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const parsed = etapaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { etapaId: parsed.data.etapaId },
      include: { etapa: true },
    });

    res.json(lead);
  }
);

// PATCH /api/crm/leads/:id
router.patch(
  "/leads/:id",
  verifyJWT,
  auditLog("ACTUALIZAR_LEAD_CRM", "crm"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const parsed = leadCrmSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { valorEstimado, fechaCierreEstimada, notasCRM, asignadoAdminId } = parsed.data;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        valorEstimado,
        fechaCierreEstimada: fechaCierreEstimada ? new Date(fechaCierreEstimada) : undefined,
        notasCRM,
        asignadoAdminId,
      },
    });

    res.json(lead);
  }
);

export default router;
