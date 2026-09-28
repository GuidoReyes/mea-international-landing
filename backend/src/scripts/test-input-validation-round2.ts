/**
 * Pruebas de validación de entradas, segunda pasada (tarea #500, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-input-validation-round2.ts
 */
import assert from "node:assert/strict";
import { horarioSchema } from "../routes/clases-en-vivo";
import { CATEGORIAS_EGRESO } from "../routes/finanzas";
import { createCursoSchema, updateCursoSchema } from "../routes/cursos";
import { ESTADOS_PAGO, MONEDAS, METODOS_PAGO } from "../routes/pagos";
import { parseCsvRows } from "../lib/csv-utils";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

// ── vuln_021: horario de clases en vivo ───────────────────────────────────────

check("horarioSchema acepta diaSemana 0-6 y horaInicio HH:mm válidos", () => {
  assert.equal(horarioSchema.safeParse({ diaSemana: 0, horaInicio: "08:30" }).success, true);
  assert.equal(horarioSchema.safeParse({ diaSemana: 6, horaInicio: "23:59" }).success, true);
});

check("horarioSchema rechaza diaSemana fuera de 0-6", () => {
  assert.equal(horarioSchema.safeParse({ diaSemana: -1, horaInicio: "08:00" }).success, false);
  assert.equal(horarioSchema.safeParse({ diaSemana: 7, horaInicio: "08:00" }).success, false);
});

check("horarioSchema rechaza horaInicio con formato inválido", () => {
  assert.equal(horarioSchema.safeParse({ diaSemana: 1, horaInicio: "25:00" }).success, false);
  assert.equal(horarioSchema.safeParse({ diaSemana: 1, horaInicio: "no-es-hora" }).success, false);
  assert.equal(horarioSchema.safeParse({ diaSemana: 1, horaInicio: "8:00" }).success, false);
});

// ── vuln_023: categoria de egresos ────────────────────────────────────────────

check("CATEGORIAS_EGRESO coincide con el enum CategoriaEgreso de Prisma", () => {
  assert.deepEqual([...CATEGORIAS_EGRESO], ["SALARIO", "COMISION", "OPERATIVO", "MARKETING"]);
});

// ── vuln_027: cursos ───────────────────────────────────────────────────────────

check("createCursoSchema rechaza precio negativo o cero", () => {
  const base = { nombre: "X", descripcion: "Y", modalidad: "online", duracion: "8 semanas" };
  assert.equal(createCursoSchema.safeParse({ ...base, precio: 0 }).success, false);
  assert.equal(createCursoSchema.safeParse({ ...base, precio: -100 }).success, false);
  assert.equal(createCursoSchema.safeParse({ ...base, precio: 100 }).success, true);
});

check("createCursoSchema rechaza precio como string (antes pasaba directo a Prisma)", () => {
  const base = { nombre: "X", descripcion: "Y", modalidad: "online", duracion: "8 semanas" };
  assert.equal(createCursoSchema.safeParse({ ...base, precio: "100" }).success, false);
});

check("updateCursoSchema permite parches parciales sin exigir todos los campos", () => {
  assert.equal(updateCursoSchema.safeParse({ precio: 200 }).success, true);
  assert.equal(updateCursoSchema.safeParse({ activo: false }).success, true);
});

// ── vuln_034: filtros de pagos ────────────────────────────────────────────────

check("ESTADOS_PAGO incluye VENCIDO (para filtrar) aunque patchSchema no lo permita setear", () => {
  assert.ok((ESTADOS_PAGO as readonly string[]).includes("VENCIDO"));
});

check("MONEDAS y METODOS_PAGO coinciden con los enums de Prisma", () => {
  assert.deepEqual([...MONEDAS], ["GTQ", "USD"]);
  assert.deepEqual([...METODOS_PAGO], ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "OTRO"]);
});

// ── vuln_025: parser real de CSV (campos citados con coma) ───────────────────

check("parseCsvRows separa columnas normales igual que split(',')", () => {
  const rows = parseCsvRows("a,b,c\n1,2,3\n");
  assert.deepEqual(rows, [["a", "b", "c"], ["1", "2", "3"]]);
});

check("parseCsvRows NO desalinea un campo citado que contiene una coma", () => {
  const rows = parseCsvRows('nombre,apellido,email\nCarlos,"Pérez, Jr.",carlos@x.com\n');
  assert.deepEqual(rows, [
    ["nombre", "apellido", "email"],
    ["Carlos", "Pérez, Jr.", "carlos@x.com"],
  ]);
});

check("parseCsvRows ignora líneas vacías", () => {
  const rows = parseCsvRows("a,b\n\n1,2\n\n");
  assert.deepEqual(rows, [["a", "b"], ["1", "2"]]);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
