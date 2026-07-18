# Task ID: 123

**Title:** Implement timezone-aware time calculation utilities

**Status:** done

**Dependencies:** 121 ✓

**Priority:** high

**Description:** Create backend/src/lib/horario-clases.ts with pure functions for Guatemala timezone handling using Intl.DateTimeFormat

**Details:**

Create `backend/src/lib/horario-clases.ts` with pure, testable functions for time calculations in America/Guatemala timezone (UTC-6, no DST).

Implement these functions:

```typescript
import { GrupoClaseEnVivo, HorarioClase } from "@prisma/client";

export type GrupoConHorarios = GrupoClaseEnVivo & { horarios: HorarioClase[] };

export interface ClaseEnVivo {
  grupoId: number;
  grupoSlug: string;
  nombre: string;
  audiencia: string;
  niveles: string;
  profesor: string | null;
  horaFin: string; // "HH:mm"
}

export interface ProximaClase {
  grupoId: number;
  nombre: string;
  diaSemana: number;
  horaInicio: string;
  niveles: string;
  minutosHasta: number; // always positive
}

// Pure function: converts any Date to Guatemala time components
export function obtenerAhoraGuatemala(fecha: Date = new Date()): { diaSemana: number; minutos: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala',
    weekday: 'narrow', // returns single letter, use numeric
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // More reliable approach: use getDay() after converting to Guatemala
  const gtDate = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
  const diaSemana = gtDate.getDay(); // 0=Sun, 1=Mon, etc.
  const minutos = gtDate.getHours() * 60 + gtDate.getMinutes();
  
  return { diaSemana, minutos };
}

// Check if a schedule is currently live
export function estaEnVivo(
  horario: { diaSemana: number; horaInicio: string },
  duracionMinutos: number,
  ahora: { diaSemana: number; minutos: number }
): boolean {
  if (horario.diaSemana !== ahora.diaSemana) return false;
  
  const [h, m] = horario.horaInicio.split(':').map(Number);
  const inicio = h * 60 + m;
  const fin = inicio + duracionMinutos;
  
  return ahora.minutos >= inicio && ahora.minutos < fin;
}

// Get all currently live classes
export function obtenerClasesEnVivo(
  grupos: GrupoConHorarios[],
  ahora: { diaSemana: number; minutos: number }
): ClaseEnVivo[] {
  const resultado: ClaseEnVivo[] = [];
  
  for (const grupo of grupos.filter(g => g.activo)) {
    for (const horario of grupo.horarios) {
      if (estaEnVivo(horario, grupo.duracionMinutos, ahora)) {
        const [h, m] = horario.horaInicio.split(':').map(Number);
        const finMin = h * 60 + m + grupo.duracionMinutos;
        const horaFin = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`;
        
        resultado.push({
          grupoId: grupo.id,
          grupoSlug: grupo.slug,
          nombre: grupo.nombre,
          audiencia: grupo.audiencia,
          niveles: grupo.niveles,
          profesor: grupo.profesor,
          horaFin
        });
      }
    }
  }
  
  return resultado;
}

// Get next upcoming class (smallest future distance in the week)
export function obtenerProximaClase(
  grupos: GrupoConHorarios[],
  ahora: { diaSemana: number; minutos: number }
): ProximaClase | null {
  let mejorDistancia = Infinity;
  let mejor: ProximaClase | null = null;
  
  for (const grupo of grupos.filter(g => g.activo)) {
    for (const horario of grupo.horarios) {
      const [h, m] = horario.horaInicio.split(':').map(Number);
      const inicio = h * 60 + m;
      
      // Calculate distance in minutes (wrapping week if needed)
      let distancia: number;
      if (horario.diaSemana === ahora.diaSemana && inicio > ahora.minutos) {
        distancia = inicio - ahora.minutos;
      } else if (horario.diaSemana > ahora.diaSemana) {
        distancia = (horario.diaSemana - ahora.diaSemana) * 1440 + inicio - ahora.minutos;
      } else {
        // Wrap to next week
        distancia = (7 - ahora.diaSemana + horario.diaSemana) * 1440 + inicio - ahora.minutos;
      }
      
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        mejor = {
          grupoId: grupo.id,
          nombre: grupo.nombre,
          diaSemana: horario.diaSemana,
          horaInicio: horario.horaInicio,
          niveles: grupo.niveles,
          minutosHasta: distancia
        };
      }
    }
  }
  
  return mejor;
}
```

All functions are pure with injected time parameter for testability (pattern from lib/recurrente.ts).

**Test Strategy:**

Write test-clases-en-vivo.ts (next task) to verify timezone calculations work correctly regardless of server timezone, and that próxima clase correctly wraps to next week when needed.
