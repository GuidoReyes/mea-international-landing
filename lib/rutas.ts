// Fetchers server-side para el catálogo de Rutas (curación de lecciones por track).
// Mismo patrón que lib/cursos-online.ts.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
const REVALIDATE_SECONDS = 300;

export interface RutaResumen {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivelMinimo: string;
  nivelMaximo: string;
  icono: string | null;
  proximamente: boolean;
  totalLecciones: number;
}

export interface LeccionCurriculum {
  id: number;
  titulo: string;
  slug: string;
  esGratis: boolean;
  bloqueada: boolean;
  urlContenido: string | null;
  completada?: boolean;
  puntaje?: number | null;
}

export interface CapituloCurriculum {
  id: number;
  titulo: string;
  nivel: string;
  lecciones: LeccionCurriculum[];
}

export interface RutaCurriculum {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivelMinimo: string;
  nivelMaximo: string;
  proximamente: boolean;
  capitulos: CapituloCurriculum[];
  suscripcionActiva?: boolean;
  porcentaje?: number;
}

export async function getRutas(): Promise<RutaResumen[]> {
  try {
    const res = await fetch(`${API_URL}/api/rutas`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as RutaResumen[];
  } catch {
    return [];
  }
}

export async function getRutaCurriculum(slug: string): Promise<RutaCurriculum | null> {
  try {
    const res = await fetch(`${API_URL}/api/rutas/${encodeURIComponent(slug)}/curriculum`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as RutaCurriculum;
  } catch {
    return null;
  }
}

export const NIVELES = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Nivel = (typeof NIVELES)[number];

export function colorBadgeNivel(nivelMinimo: string, nivelMaximo: string): string {
  const incluyeC = nivelMaximo === "C1";
  const soloBasico = ["A1", "A2"].includes(nivelMaximo);
  if (soloBasico) return "bg-emerald-50 text-emerald-600";
  if (incluyeC) return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-600";
}
