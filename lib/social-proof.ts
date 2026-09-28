// Fuente única de las cifras de prueba social del sitio (fase5 R4) — antes
// estaban repetidas/hardcodeadas en varios lugares de app/page.tsx.

export const socialProof = {
  // fuente: unificado por el propietario en fase1 (commit 0123b61,
  // 2026-09-17) tras detectar una inconsistencia previa (200 vs 2,000).
  studentCount: 200,
  // fuente: propietario, fase1 (mismo commit que studentCount).
  countriesCount: 10,
  // fuente: propietario, fase1 (mismo commit que studentCount).
  satisfactionRate: 98,
  rating: 4.9,
} as const;
