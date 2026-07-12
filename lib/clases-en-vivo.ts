// Fetcher server-side para el horario público de clases en vivo.
// Mismo patrón que lib/rutas.ts. NUNCA incluye urlZoom (el backend la filtra).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";

export interface HorarioSlot {
  diaSemana: number;
  horaInicio: string;
}

export interface GrupoPublico {
  id: number;
  slug: string;
  nombre: string;
  audiencia: string;
  niveles: string;
  descripcion: string | null;
  profesor: string | null;
  duracionMinutos: number;
  horarios: HorarioSlot[];
}

export interface ClaseEnVivo {
  grupoId: number;
  horario: HorarioSlot;
  minutosRestantes: number;
}

export interface ProximaClase {
  grupoId: number;
  horario: HorarioSlot;
  minutosHasta: number;
}

export interface HorarioClasesResponse {
  ahora: { diaSemana: number; minutos: number };
  grupos: GrupoPublico[];
  liveNow: ClaseEnVivo[];
  nextClass: ProximaClase | null;
}

export async function getHorarioClases(): Promise<HorarioClasesResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/clases-en-vivo/horario`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HorarioClasesResponse;
  } catch {
    return null;
  }
}

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function colorBadgeNivelClase(niveles: string): string {
  if (niveles.includes("PRE")) return "bg-slate-100 text-slate-500";
  if (niveles.includes("B2") || niveles.includes("C1")) return "bg-red-50 text-red-600";
  return "bg-emerald-50 text-emerald-600";
}

export function etiquetaAudiencia(audiencia: string): string {
  const mapa: Record<string, string> = {
    ninos: "Niños",
    adolescentes: "Adolescentes",
    adultos: "Adultos",
    general: "General",
  };
  return mapa[audiencia] ?? audiencia;
}

export function formatearHora12h(horaInicio: string): string {
  const [horaStr, minStr] = horaInicio.split(":");
  const hora = parseInt(horaStr!, 10);
  const periodo = hora >= 12 ? "PM" : "AM";
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${minStr} ${periodo}`;
}

export function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
