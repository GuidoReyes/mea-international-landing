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

// PRD mea-logica-negocio, R3 (opcion B, decision del dueno): fechaFin en
// pagos-deposito.ts sigue siendo calendario fijo (hoy + duracionMeses), no
// se liga a sesiones entregadas. La mitigacion es que el admin extienda a
// mano (acceso-manual, ya existente) cuando una sesion se atraso -- pero
// para eso necesita saber a quien mirar *antes* de que se quede sin acceso,
// no despues de que el alumno reclame (asi se originó el incidente real que
// dio pie a este PRD). Esta funcion es esa lista de alerta.
const UMBRAL_RIESGO_DIAS = 5;

export interface AlumnoEnRiesgo {
  id: number;
  nombre: string;
  apellido: string;
  email: string | null;
  fechaFin: Date;
  sesionesRecibidas: number;
  bloqueTotal: number;
}

export async function alumnosEnRiesgo(): Promise<AlumnoEnRiesgo[]> {
  const limite = new Date(Date.now() + UMBRAL_RIESGO_DIAS * 24 * 60 * 60 * 1000);

  const candidatas = await prisma.suscripcion.findMany({
    where: {
      estado: "ACTIVA",
      proveedor: { not: "manual_admin" },
      fechaFin: { not: null, lte: limite },
    },
    select: {
      alumnoId: true,
      fechaFin: true,
      alumno: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
  });

  // Un alumno puede tener mas de una suscripcion candidata; se queda con la
  // de vencimiento mas proximo para no repetirlo en la lista.
  const porAlumno = new Map<number, (typeof candidatas)[number]>();
  for (const c of candidatas) {
    if (!c.fechaFin) continue;
    const existente = porAlumno.get(c.alumnoId);
    if (!existente || !existente.fechaFin || c.fechaFin < existente.fechaFin) {
      porAlumno.set(c.alumnoId, c);
    }
  }

  const resultados: AlumnoEnRiesgo[] = [];
  for (const c of porAlumno.values()) {
    if (!c.fechaFin) continue;
    const resumen = await calcularResumenSesiones(c.alumnoId);
    if (resumen.sesionesRecibidas < resumen.bloqueTotal) {
      resultados.push({
        id: c.alumno.id,
        nombre: c.alumno.nombre,
        apellido: c.alumno.apellido,
        email: c.alumno.email,
        fechaFin: c.fechaFin,
        sesionesRecibidas: resumen.sesionesRecibidas,
        bloqueTotal: resumen.bloqueTotal,
      });
    }
  }

  return resultados.sort((a, b) => a.fechaFin.getTime() - b.fechaFin.getTime());
}
