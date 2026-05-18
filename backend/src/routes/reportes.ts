import { Router, Request, Response } from "express";
import { subDays, subMonths, startOfMonth, endOfMonth, format, startOfDay } from "date-fns";
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

// GET /api/reportes/pl — P&L últimos 12 meses
router.get("/pl", verifyJWT, async (_req: Request, res: Response) => {
  const now = new Date();
  const meses = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));

  const [pagos, egresos] = await Promise.all([
    prisma.pago.findMany({
      where: { estado: "COMPLETADO", creadoEn: { gte: startOfMonth(meses[0]) } },
      select: { monto: true, creadoEn: true },
    }),
    prisma.egreso.findMany({
      where: { fecha: { gte: startOfMonth(meses[0]) } },
      select: { monto: true, fecha: true },
    }),
  ]);

  const pl = meses.map((mes) => {
    const mesKey = format(mes, "yyyy-MM");
    const ingresos = pagos
      .filter((p) => format(p.creadoEn, "yyyy-MM") === mesKey)
      .reduce((s, p) => s + Number(p.monto), 0);
    const egresosTotal = egresos
      .filter((e) => format(e.fecha, "yyyy-MM") === mesKey)
      .reduce((s, e) => s + Number(e.monto), 0);
    return {
      mes: mesKey,
      ingresos: Math.round(ingresos * 100) / 100,
      egresos: Math.round(egresosTotal * 100) / 100,
      utilidad: Math.round((ingresos - egresosTotal) * 100) / 100,
    };
  });

  res.json(pl);
});

// GET /api/reportes/proyecciones — cuotas pendientes próximos 6 meses
router.get("/proyecciones", verifyJWT, async (_req: Request, res: Response) => {
  const now = new Date();
  const hasta = endOfMonth(subMonths(now, -6));

  const cuotas = await prisma.cuotaPago.findMany({
    where: { estado: "PENDIENTE", fechaVence: { gte: startOfDay(now), lte: hasta } },
    select: { monto: true, fechaVence: true },
  });

  const meses = Array.from({ length: 6 }, (_, i) => subMonths(now, -i));
  const proyecciones = meses.map((mes) => {
    const mesKey = format(mes, "yyyy-MM");
    const total = cuotas
      .filter((c) => format(c.fechaVence, "yyyy-MM") === mesKey)
      .reduce((s, c) => s + Number(c.monto), 0);
    return { mes: mesKey, proyectado: Math.round(total * 100) / 100 };
  });

  res.json(proyecciones);
});

// GET /api/reportes/flujo-caja — saldo actual + proyección 30 días
router.get("/flujo-caja", verifyJWT, async (_req: Request, res: Response) => {
  const now = new Date();
  const en30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const hace90 = startOfMonth(subMonths(now, 3));

  const [totalIngresos, totalEgresos, cuotasPendientes30, egresosUltimos3] = await Promise.all([
    prisma.pago.aggregate({ where: { estado: "COMPLETADO" }, _sum: { monto: true } }),
    prisma.egreso.aggregate({ _sum: { monto: true } }),
    prisma.cuotaPago.aggregate({
      where: { estado: "PENDIENTE", fechaVence: { lte: en30dias } },
      _sum: { monto: true },
    }),
    prisma.egreso.aggregate({
      where: { fecha: { gte: hace90 } },
      _sum: { monto: true },
    }),
  ]);

  const saldoActual = Number(totalIngresos._sum.monto ?? 0) - Number(totalEgresos._sum.monto ?? 0);
  const ingresoProyectado30 = Number(cuotasPendientes30._sum.monto ?? 0);
  const egresoPromMensual = Number(egresosUltimos3._sum.monto ?? 0) / 3;
  const egresoProyectado30 = Math.round((egresoPromMensual / 30) * 30 * 100) / 100;

  res.json({
    saldoActual: Math.round(saldoActual * 100) / 100,
    ingresoProyectado30dias: Math.round(ingresoProyectado30 * 100) / 100,
    egresoProyectado30dias: Math.round(egresoProyectado30 * 100) / 100,
    flujoPROyectado30dias: Math.round((ingresoProyectado30 - egresoProyectado30) * 100) / 100,
  });
});

export default router;
