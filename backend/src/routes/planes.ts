import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getJSON, setJSON, COURSE_CACHE_TTL } from "../lib/redis";

const router = Router();
const CACHE_KEY = "planes:all";

interface PlanPrecioPublico {
  id: number;
  duracionMeses: number;
  precioMesCentavos: number;
  precioTotalCentavos: number;
  precioRegularCentavos: number;
  moneda: string;
  ahorroPorcentaje: number;
}

interface PlanPublico {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  features: string[];
  recomendado: boolean;
  precios: PlanPrecioPublico[];
}

function calcularAhorro(regular: number, total: number): number {
  if (regular <= 0 || total >= regular) return 0;
  return Math.round((1 - total / regular) * 100);
}

// GET /api/planes — planes y precios públicos para la landing de pricing
router.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = await getJSON<PlanPublico[]>(CACHE_KEY);
    if (cached) { res.json(cached); return; }
  } catch { /* Redis unavailable, fall through to DB */ }

  const planes = await prisma.plan.findMany({
    include: { precios: { orderBy: { duracionMeses: "asc" } } },
    orderBy: { id: "asc" },
  });

  const publicos: PlanPublico[] = planes.map((plan) => ({
    id: plan.id,
    nombre: plan.nombre,
    slug: plan.slug,
    descripcion: plan.descripcion,
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    recomendado: plan.recomendado,
    precios: plan.precios.map((precio) => ({
      id: precio.id,
      duracionMeses: precio.duracionMeses,
      precioMesCentavos: precio.precioMesCentavos,
      precioTotalCentavos: precio.precioTotalCentavos,
      precioRegularCentavos: precio.precioRegularCentavos,
      moneda: precio.moneda,
      ahorroPorcentaje: calcularAhorro(precio.precioRegularCentavos, precio.precioTotalCentavos),
    })),
  }));

  try { await setJSON(CACHE_KEY, publicos, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(publicos);
});

export default router;
