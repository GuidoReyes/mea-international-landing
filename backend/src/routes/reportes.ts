import { Router, Request, Response } from "express";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

function getPeriodoDays(periodo: string): number {
  if (periodo === "7d") return 7;
  if (periodo === "90d") return 90;
  return 30;
}

router.get("/leads", verifyJWT, async (req: Request, res: Response) => {
  const dias = getPeriodoDays(req.query.periodo as string);
  const desde = startOfDay(subDays(new Date(), dias));

  const [allLeads, leadsEnPeriodo, etapas] = await Promise.all([
    prisma.lead.findMany({
      include: { etapa: { select: { nombre: true } } },
    }),
    prisma.lead.findMany({
      where: { creadoEn: { gte: desde } },
      include: { etapa: { select: { nombre: true } } },
      orderBy: { creadoEn: "asc" },
    }),
    prisma.cRMEtapa.findMany({ orderBy: { orden: "asc" } }),
  ]);

  // Por estado (todos los leads)
  const porEstado: Record<string, number> = {};
  for (const lead of allLeads) {
    porEstado[lead.estado] = (porEstado[lead.estado] ?? 0) + 1;
  }

  // Por etapa con valor total
  const etapaMap: Record<number, { nombre: string; count: number; valorTotal: number }> = {};
  for (const etapa of etapas) {
    etapaMap[etapa.id] = { nombre: etapa.nombre, count: 0, valorTotal: 0 };
  }
  for (const lead of allLeads) {
    if (lead.etapaId && etapaMap[lead.etapaId]) {
      etapaMap[lead.etapaId].count += 1;
      etapaMap[lead.etapaId].valorTotal += Number(lead.valorEstimado ?? 0);
    }
  }
  const porEtapa = Object.entries(etapaMap).map(([etapaId, data]) => ({
    etapaId: Number(etapaId),
    ...data,
    valorTotal: Math.round(data.valorTotal * 100) / 100,
  }));

  // Evolución diaria en el período
  const diasMap: Record<string, number> = {};
  for (let i = dias - 1; i >= 0; i--) {
    diasMap[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
  }
  for (const lead of leadsEnPeriodo) {
    const key = format(lead.creadoEn, "yyyy-MM-dd");
    if (key in diasMap) diasMap[key] += 1;
  }
  const evolucion = Object.entries(diasMap).map(([fecha, total]) => ({ fecha, total }));

  // Tasa de conversión
  const totalLeads = allLeads.length;
  const inscritos = allLeads.filter((l) => l.estado === "inscrito").length;
  const tasaConversion = totalLeads > 0 ? Math.round((inscritos / totalLeads) * 10000) / 100 : 0;

  // Tiempo promedio de cierre (leads en etapa "Cerrado")
  const cerrados = allLeads.filter(
    (l) => l.etapa?.nombre?.toLowerCase().includes("cerrado") || l.etapa?.nombre?.toLowerCase().includes("ganado")
  );
  let tiempoPromedioCierre: number | null = null;
  if (cerrados.length > 0) {
    const totalDias = cerrados.reduce((sum, lead) => {
      const diff = (new Date().getTime() - lead.creadoEn.getTime()) / (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    tiempoPromedioCierre = Math.round((totalDias / cerrados.length) * 10) / 10;
  }

  res.json({
    periodo: `${dias}d`,
    totalLeads,
    porEstado,
    porEtapa,
    evolucion,
    tasaConversion,
    tiempoPromedioCierre,
  });
});

router.get("/resumen", verifyJWT, async (req: Request, res: Response) => {
  const hoy = new Date();
  const hace30 = startOfDay(subDays(hoy, 30));
  const hace7 = startOfDay(subDays(hoy, 7));

  const [totalLeads, nuevosEste_mes, nuevosEsta_semana, inscripciones, pagos] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { creadoEn: { gte: hace30 } } }),
    prisma.lead.count({ where: { creadoEn: { gte: hace7 } } }),
    prisma.inscripcion.count({ where: { estado: "ACTIVA" } }),
    prisma.pago.aggregate({
      where: { estado: "COMPLETADO", creadoEn: { gte: hace30 } },
      _sum: { monto: true },
    }),
  ]);

  res.json({
    totalLeads,
    nuevosUltimos30dias: nuevosEste_mes,
    nuevosUltimos7dias: nuevosEsta_semana,
    inscripcionesActivas: inscripciones,
    ingresosMes: Number(pagos._sum.monto ?? 0),
  });
});

export default router;
