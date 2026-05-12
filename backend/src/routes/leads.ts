import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

const ESTADOS_VALIDOS = ["nuevo", "contactado", "inscrito"] as const;

router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;
  const estado = req.query.estado as string | undefined;

  const where = estado ? { estado } : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { creadoEn: "desc" },
      include: { _count: { select: { conversaciones: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ data: leads, meta: { total, page, limit } });
});

router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      conversaciones: {
        include: {
          mensajes: { orderBy: { creadoEn: "desc" }, take: 50 },
        },
        orderBy: { creadoEn: "desc" },
      },
    },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead no encontrado" });
    return;
  }

  res.json(lead);
});

router.patch("/:id", verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { nombre, email, interes, estado } = req.body as {
    nombre?: string;
    email?: string;
    interes?: string;
    estado?: string;
  };

  if (estado && !(ESTADOS_VALIDOS as readonly string[]).includes(estado)) {
    res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });
    return;
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { nombre, email, interes, estado },
  });

  res.json(lead);
});

export default router;
