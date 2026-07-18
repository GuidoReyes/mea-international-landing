# Task ID: 129

**Title:** Create frontend fetcher library for live classes

**Status:** done

**Dependencies:** 126 ✓

**Priority:** medium

**Description:** Implement lib/clases-en-vivo.ts following the pattern from lib/rutas.ts for server-side fetching

**Details:**

Create `lib/clases-en-vivo.ts` following the exact pattern from `lib/rutas.ts` (server-side fetcher with revalidation):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
const REVALIDATE_SECONDS = 60; // Refresh every minute for live status

export interface HorarioSemanal {
  id: number;
  slug: string;
  nombre: string;
  audiencia: string;
  niveles: string;
  descripcion: string | null;
  profesor: string | null;
  duracionMinutos: number;
  horarios: { diaSemana: number; horaInicio: string }[];
}

export interface ClaseEnVivo {
  grupoId: number;
  grupoSlug: string;
  nombre: string;
  audiencia: string;
  niveles: string;
  profesor: string | null;
  horaFin: string;
}

export interface ProximaClase {
  grupoId: number;
  nombre: string;
  diaSemana: number;
  horaInicio: string;
  niveles: string;
  minutosHasta: number;
}

export interface HorarioClasesResponse {
  horarioSemanal: HorarioSemanal[];
  liveNow: ClaseEnVivo[];
  nextClass: ProximaClase | null;
}

export async function getHorarioClases(): Promise<HorarioClasesResponse> {
  const res = await fetch(`${API_URL}/api/clases-en-vivo/horario`, {
    next: { revalidate: REVALIDATE_SECONDS }
  });
  
  if (!res.ok) {
    throw new Error(`Error fetching horario: ${res.status}`);
  }
  
  return res.json();
}

export async function entrarClase(grupoId: number, token: string): Promise<{ zoomUrl: string }> {
  const res = await fetch(`${API_URL}/api/clases-en-vivo/${grupoId}/entrar`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store' // Never cache Zoom URLs
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `Error ${res.status}`);
  }
  
  return res.json();
}

// Helper: day of week number to Spanish name
export function nombreDiaSemana(dia: number): string {
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return nombres[dia] ?? 'Desconocido';
}

// Helper: badge color by audience
export function colorAudiencia(audiencia: string): string {
  switch (audiencia) {
    case 'ninos': return 'bg-blue-100 text-blue-700';
    case 'adolescentes': return 'bg-purple-100 text-purple-700';
    case 'adultos': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// Helper: badge color by level (extends colorBadgeNivel from lib/rutas.ts)
export function colorNivel(niveles: string): string {
  if (niveles.includes('PRE_')) return 'bg-gray-100 text-gray-600';
  if (niveles.includes('B2') || niveles.includes('C1')) return 'bg-red-100 text-red-700';
  return 'bg-green-100 text-green-700'; // A1, A2
}
```

**Test Strategy:**

After creating the frontend page (task 130), verify fetcher works: (1) getHorarioClases() returns data with correct types, (2) entrarClase() with valid token returns {zoomUrl}, (3) Helper functions return correct colors and day names.
