import assert from "assert";
import {
  obtenerAhoraGuatemala,
  estaEnVivo,
  obtenerClasesEnVivo,
  obtenerProximaClase,
  puedeEntrarAhora,
  GrupoConHorarios,
} from "../lib/horario-clases";

// ─── obtenerAhoraGuatemala: servidor en UTC no debe afectar el resultado ────

// Lunes 2026-07-13 01:30 UTC = domingo 2026-07-12 19:30 Guatemala (UTC-6)
const utcQueEsDomingoNoche = new Date("2026-07-13T01:30:00Z");
const ahoraDesdeUtc = obtenerAhoraGuatemala(utcQueEsDomingoNoche);
assert.strictEqual(ahoraDesdeUtc.diaSemana, 0, "domingo en Guatemala pese a ser lunes en UTC");
assert.strictEqual(ahoraDesdeUtc.minutos, 19 * 60 + 30);

// Lunes 2026-07-13 23:30 UTC = lunes 2026-07-13 17:30 Guatemala
const utcQueEsLunesTarde = new Date("2026-07-13T23:30:00Z");
const ahoraLunes = obtenerAhoraGuatemala(utcQueEsLunesTarde);
assert.strictEqual(ahoraLunes.diaSemana, 1);
assert.strictEqual(ahoraLunes.minutos, 17 * 60 + 30);

console.log("✓ obtenerAhoraGuatemala: 2 casos OK (servidor UTC no afecta el resultado)");

// ─── estaEnVivo ──────────────────────────────────────────────────────────────

const horarioLunes1920 = { diaSemana: 1, horaInicio: "19:20" };
const duracion = 60;

// Dentro de la ventana
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 30 }), true);

// Justo al empezar (inclusive)
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 20 }), true);

// Un minuto antes de empezar
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 19 }), false);

// Justo al terminar (exclusive: 19:20 + 60min = 20:20)
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 1, minutos: 20 * 60 + 20 }), false);

// Un minuto antes de terminar — todavía en vivo
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 1, minutos: 20 * 60 + 19 }), true);

// Mismo horario, día distinto
assert.strictEqual(estaEnVivo(horarioLunes1920, duracion, { diaSemana: 2, minutos: 19 * 60 + 30 }), false);

console.log("✓ estaEnVivo: 6 casos OK (incluyendo límites exactos de inicio/fin)");

// ─── Grupos de ejemplo (imitan el seed real) ────────────────────────────────

const grupos: GrupoConHorarios[] = [
  {
    id: 1,
    duracionMinutos: 60,
    horarios: [
      { diaSemana: 1, horaInicio: "19:20" }, // Advance Conversacional, lunes
      { diaSemana: 3, horaInicio: "19:20" }, // Advance Conversacional, miércoles
    ],
  },
  {
    id: 2,
    duracionMinutos: 60,
    horarios: [
      { diaSemana: 2, horaInicio: "09:30" }, // Starters, martes
      { diaSemana: 4, horaInicio: "09:30" }, // Starters, jueves
    ],
  },
];

// Lunes 7:30 PM Guatemala → Advance Conversacional en vivo (empezó 19:20)
const enVivoLunes = obtenerClasesEnVivo(grupos, { diaSemana: 1, minutos: 19 * 60 + 30 });
assert.strictEqual(enVivoLunes.length, 1);
assert.strictEqual(enVivoLunes[0]!.grupoId, 1);
assert.strictEqual(enVivoLunes[0]!.minutosRestantes, 50);

// Martes 10:00 AM → Starters sigue en vivo (empezó 9:30, dura 60min, termina 10:30)
const enVivoMartes = obtenerClasesEnVivo(grupos, { diaSemana: 2, minutos: 10 * 60 });
assert.strictEqual(enVivoMartes.length, 1);
assert.strictEqual(enVivoMartes[0]!.grupoId, 2);

// Ningún grupo en vivo
const sinClases = obtenerClasesEnVivo(grupos, { diaSemana: 5, minutos: 12 * 60 });
assert.deepStrictEqual(sinClases, []);

console.log("✓ obtenerClasesEnVivo: 3 casos OK");

// ─── obtenerProximaClase ─────────────────────────────────────────────────────

// Hoy es jueves 21:00 (después de la última clase de la semana, jueves 9:30) →
// la próxima debe ser el lunes siguiente (envolver la semana), no el mismo jueves.
const proximaDesdeJuevesNoche = obtenerProximaClase(grupos, { diaSemana: 4, minutos: 21 * 60 });
assert.ok(proximaDesdeJuevesNoche !== null);
assert.strictEqual(proximaDesdeJuevesNoche!.horario.diaSemana, 1, "debe envolver a la semana siguiente (lunes)");
assert.strictEqual(proximaDesdeJuevesNoche!.horario.horaInicio, "19:20");
// De jueves 21:00 a lunes 19:20: resto del jueves (180min, hasta medianoche)
// + viernes + sábado + domingo completos (3*1440min) + hasta las 19:20 del
// lunes (1160min) = 180 + 4320 + 1160 = 5660
const esperadoMinutos = 180 + 3 * 24 * 60 + (19 * 60 + 20);
assert.strictEqual(proximaDesdeJuevesNoche!.minutosHasta, esperadoMinutos);

// Próxima clase el mismo día, más tarde
const proximaMismoDia = obtenerProximaClase(grupos, { diaSemana: 1, minutos: 8 * 60 });
assert.ok(proximaMismoDia !== null);
assert.strictEqual(proximaMismoDia!.horario.diaSemana, 1);
assert.strictEqual(proximaMismoDia!.minutosHasta, 19 * 60 + 20 - 8 * 60);

// Sin grupos → null
assert.strictEqual(obtenerProximaClase([], { diaSemana: 1, minutos: 0 }), null);

console.log("✓ obtenerProximaClase: 3 casos OK (incluye cruce de semana jueves→lunes)");

// ─── puedeEntrarAhora (ventana de gracia de 10 min) ─────────────────────────

// 10 minutos antes de empezar — dentro de la ventana de gracia
assert.strictEqual(
  puedeEntrarAhora(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 10 }),
  true
);
// 11 minutos antes — fuera de la ventana
assert.strictEqual(
  puedeEntrarAhora(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 9 }),
  false
);
// Durante la clase
assert.strictEqual(
  puedeEntrarAhora(horarioLunes1920, duracion, { diaSemana: 1, minutos: 19 * 60 + 45 }),
  true
);

console.log("✓ puedeEntrarAhora: 3 casos OK");
console.log("Todos los tests de clases en vivo pasaron.");
