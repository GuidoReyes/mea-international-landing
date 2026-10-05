import prisma from "./prisma";

// PRD mea-logica-negocio, R4: la tarjeta de alumno en el admin necesita datos
// reales (ultimo pago, sesiones recibidas, asistencia, proxima sesion) para
// que la decision de acceso manual (ya existente, se mantiene) sea informada
// en vez de depender del badge roto que solo miraba estado==="ACTIVA".

const SESIONES_POR_BLOQUE = 8;

export interface UltimoPago {
  fecha: Date;
  monto: number;
  tipo: "online" | "presencial";
}

export interface AsistenciaResumen {
  sesionId: number;
  fechaHora: Date;
  asistio: boolean;
  fuente: string;
}

export interface ProximaSesion {
  id: number;
  fechaHora: Date;
  grupoNombre: string;
}

export interface ResumenSesiones {
  ultimoPago: UltimoPago | null;
  sesionesRecibidas: number;
  bloqueTotal: number;
  asistenciaReciente: AsistenciaResumen[];
  proximaSesion: ProximaSesion | null;
}

async function ultimoPagoDeAlumno(alumnoId: number): Promise<UltimoPago | null> {
  const [online, presencial] = await Promise.all([
    prisma.pagoSuscripcion.findFirst({
      where: { estado: "COMPLETADO", pagadoEn: { not: null }, suscripcion: { alumnoId } },
      orderBy: { pagadoEn: "desc" },
      select: { pagadoEn: true, montoCentavos: true },
    }),
    prisma.cuotaPago.findFirst({
      where: { estado: "COMPLETADO", pagadoEn: { not: null }, pago: { inscripcion: { alumnoId } } },
      orderBy: { pagadoEn: "desc" },
      select: { pagadoEn: true, monto: true },
    }),
  ]);

  const candidatos: UltimoPago[] = [
    ...(online?.pagadoEn ? [{ fecha: online.pagadoEn, monto: online.montoCentavos / 100, tipo: "online" as const }] : []),
    ...(presencial?.pagadoEn ? [{ fecha: presencial.pagadoEn, monto: Number(presencial.monto), tipo: "presencial" as const }] : []),
  ];

  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0] ?? null;
}

export async function calcularResumenSesiones(alumnoId: number): Promise<ResumenSesiones> {
  const ultimoPago = await ultimoPagoDeAlumno(alumnoId);

  // Sesiones recibidas del bloque vigente: asistencias desde el ultimo pago
  // confirmado, tope 8 (el bloque que se vende). Sin pago registrado, se
  // cuentan todas las asistencias historicas -- sigue siendo un dato real,
  // solo que no esta anclado a un pago especifico (ej. acceso manual_admin).
  const asistenciasDesde = await prisma.asistenciaSesion.findMany({
    where: {
      alumnoId,
      asistio: true,
      ...(ultimoPago ? { sesion: { fechaHora: { gte: ultimoPago.fecha } } } : {}),
    },
    select: { sesionId: true },
  });
  const sesionesRecibidas = Math.min(asistenciasDesde.length, SESIONES_POR_BLOQUE);

  const asistenciaRecienteRaw = await prisma.asistenciaSesion.findMany({
    where: { alumnoId },
    orderBy: { sesion: { fechaHora: "desc" } },
    take: 5,
    select: {
      sesionId: true,
      asistio: true,
      fuente: true,
      sesion: { select: { fechaHora: true } },
    },
  });
  const asistenciaReciente: AsistenciaResumen[] = asistenciaRecienteRaw.map((a) => ({
    sesionId: a.sesionId,
    fechaHora: a.sesion.fechaHora,
    asistio: a.asistio,
    fuente: a.fuente,
  }));

  // Proxima sesion: se infiere del grupo de la asistencia mas reciente (no
  // hay hoy una relacion explicita alumno-grupo). Sin historial de
  // asistencia, no se adivina: queda null.
  let proximaSesion: ProximaSesion | null = null;
  const ultimaAsistencia = await prisma.asistenciaSesion.findFirst({
    where: { alumnoId },
    orderBy: { sesion: { fechaHora: "desc" } },
    select: { sesion: { select: { grupoId: true } } },
  });

  if (ultimaAsistencia) {
    const siguiente = await prisma.sesionClase.findFirst({
      where: {
        grupoId: ultimaAsistencia.sesion.grupoId,
        estado: "PROGRAMADA",
        fechaHora: { gt: new Date() },
      },
      orderBy: { fechaHora: "asc" },
      select: { id: true, fechaHora: true, grupo: { select: { nombre: true } } },
    });
    if (siguiente) {
      proximaSesion = { id: siguiente.id, fechaHora: siguiente.fechaHora, grupoNombre: siguiente.grupo.nombre };
    }
  }

  return { ultimoPago, sesionesRecibidas, bloqueTotal: SESIONES_POR_BLOQUE, asistenciaReciente, proximaSesion };
}
