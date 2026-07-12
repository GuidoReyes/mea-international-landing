// Todos los cálculos de horario usan SIEMPRE America/Guatemala (UTC-6, sin
// horario de verano) vía Intl — nunca la hora del servidor (Railway corre en
// UTC) ni un offset manual.

const ZONA_GUATEMALA = "America/Guatemala";
const DIAS_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTOS_POR_DIA = 24 * 60;
const MINUTOS_POR_SEMANA = 7 * MINUTOS_POR_DIA;
const VENTANA_GRACIA_MINUTOS = 10;

export interface MomentoSemana {
  diaSemana: number; // 0=domingo .. 6=sábado
  minutos: number; // minutos desde medianoche, hora Guatemala
}

export interface HorarioBase {
  diaSemana: number;
  horaInicio: string; // "HH:mm"
}

export interface GrupoConHorarios {
  id: number;
  duracionMinutos: number;
  horarios: HorarioBase[];
}

export interface ClaseEnVivo {
  grupoId: number;
  horario: HorarioBase;
  minutosRestantes: number;
}

export interface ProximaClase {
  grupoId: number;
  horario: HorarioBase;
  minutosHasta: number;
}

function horaAMinutos(horaInicio: string): number {
  const [horas, minutos] = horaInicio.split(":").map(Number);
  return horas * 60 + minutos;
}

export function obtenerAhoraGuatemala(fecha: Date = new Date()): MomentoSemana {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_GUATEMALA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha);

  const weekday = partes.find((p) => p.type === "weekday")!.value;
  // Intl con hour12:false puede devolver "24" en vez de "00" — normalizar
  const horaRaw = partes.find((p) => p.type === "hour")!.value;
  const hora = horaRaw === "24" ? 0 : parseInt(horaRaw, 10);
  const minuto = parseInt(partes.find((p) => p.type === "minute")!.value, 10);

  return {
    diaSemana: DIAS_SEMANA.indexOf(weekday),
    minutos: hora * 60 + minuto,
  };
}

function distanciaSemanal(desde: MomentoSemana, hasta: MomentoSemana): number {
  const desdeAbs = desde.diaSemana * MINUTOS_POR_DIA + desde.minutos;
  const hastaAbs = hasta.diaSemana * MINUTOS_POR_DIA + hasta.minutos;
  const diff = hastaAbs - desdeAbs;
  return ((diff % MINUTOS_POR_SEMANA) + MINUTOS_POR_SEMANA) % MINUTOS_POR_SEMANA;
}

export function estaEnVivo(
  horario: HorarioBase,
  duracionMinutos: number,
  ahora: MomentoSemana
): boolean {
  if (horario.diaSemana !== ahora.diaSemana) return false;
  const inicio = horaAMinutos(horario.horaInicio);
  return ahora.minutos >= inicio && ahora.minutos < inicio + duracionMinutos;
}

function minutosRestantes(horario: HorarioBase, duracionMinutos: number, ahora: MomentoSemana): number {
  const inicio = horaAMinutos(horario.horaInicio);
  return inicio + duracionMinutos - ahora.minutos;
}

export function obtenerClasesEnVivo(
  grupos: GrupoConHorarios[],
  ahora: MomentoSemana
): ClaseEnVivo[] {
  const resultado: ClaseEnVivo[] = [];
  for (const grupo of grupos) {
    for (const horario of grupo.horarios) {
      if (estaEnVivo(horario, grupo.duracionMinutos, ahora)) {
        resultado.push({
          grupoId: grupo.id,
          horario,
          minutosRestantes: minutosRestantes(horario, grupo.duracionMinutos, ahora),
        });
      }
    }
  }
  return resultado;
}

// Clase con menor distancia futura en la semana. Si una clase está EN VIVO
// ahora mismo, no cuenta como "próxima" (eso lo cubre obtenerClasesEnVivo).
export function obtenerProximaClase(
  grupos: GrupoConHorarios[],
  ahora: MomentoSemana
): ProximaClase | null {
  let mejor: ProximaClase | null = null;

  for (const grupo of grupos) {
    for (const horario of grupo.horarios) {
      if (estaEnVivo(horario, grupo.duracionMinutos, ahora)) continue;

      const inicio: MomentoSemana = { diaSemana: horario.diaSemana, minutos: horaAMinutos(horario.horaInicio) };
      const minutosHasta = distanciaSemanal(ahora, inicio);

      if (!mejor || minutosHasta < mejor.minutosHasta) {
        mejor = { grupoId: grupo.id, horario, minutosHasta };
      }
    }
  }

  return mejor;
}

// Ventana de gracia para permitir entrar unos minutos antes de que empiece.
export function puedeEntrarAhora(
  horario: HorarioBase,
  duracionMinutos: number,
  ahora: MomentoSemana
): boolean {
  if (estaEnVivo(horario, duracionMinutos, ahora)) return true;
  if (horario.diaSemana !== ahora.diaSemana) return false;
  const inicio = horaAMinutos(horario.horaInicio);
  return ahora.minutos >= inicio - VENTANA_GRACIA_MINUTOS && ahora.minutos < inicio;
}
