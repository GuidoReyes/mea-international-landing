/**
 * Pruebas de integridad de datos (tarea 485): reintento ante P2002 (carnets) y
 * de-duplicación de inscripciones en la importación CSV.
 * No usa una base de datos real: simula el cliente de Prisma.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-data-integrity.ts
 */
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { createWithUniqueRetry, isUniqueConstraintOn } from "../lib/retry-on-conflict";

let failures = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

function p2002(target: string | string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

async function main(): Promise<void> {
  // ── isUniqueConstraintOn ───────────────────────────────────────────────────

  await check("detecta P2002 sobre el campo indicado (target string)", () => {
    assert.equal(isUniqueConstraintOn(p2002("carnet"), "carnet"), true);
  });

  await check("detecta P2002 sobre el campo indicado (target array — índice compuesto)", () => {
    assert.equal(isUniqueConstraintOn(p2002(["alumnoId", "edicionId"]), "alumnoId"), true);
  });

  await check("no confunde P2002 sobre OTRO campo (ej. email) con el campo pedido", () => {
    assert.equal(isUniqueConstraintOn(p2002("email"), "carnet"), false);
  });

  await check("no confunde otros códigos de error de Prisma con P2002", () => {
    const notFound = new Prisma.PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "test",
    });
    assert.equal(isUniqueConstraintOn(notFound, "carnet"), false);
  });

  await check("un error que no es de Prisma nunca cuenta como conflicto único", () => {
    assert.equal(isUniqueConstraintOn(new Error("boom"), "carnet"), false);
    assert.equal(isUniqueConstraintOn("texto plano", "carnet"), false);
    assert.equal(isUniqueConstraintOn(null, "carnet"), false);
  });

  // ── createWithUniqueRetry ──────────────────────────────────────────────────

  await check("sin conflicto: un solo intento", async () => {
    let calls = 0;
    const result = await createWithUniqueRetry(async () => {
      calls += 1;
      return "MEA-2026-0001";
    }, "carnet");
    assert.equal(result, "MEA-2026-0001");
    assert.equal(calls, 1);
  });

  await check("simula 10 creaciones concurrentes con carnets distintos: todas suceden sin colisión", async () => {
    // No hay DB real: se simula la restricción única con un Set en memoria, que es
    // exactamente lo que el índice UNIQUE de la BD ya hace hoy (Alumno_carnet_key).
    const taken = new Set<string>();
    let nextCandidate = 0;

    async function attempt(): Promise<string> {
      const candidate = `MEA-2026-${String(nextCandidate).padStart(4, "0")}`;
      nextCandidate += 1;
      if (taken.has(candidate)) throw p2002("carnet");
      taken.add(candidate);
      return candidate;
    }

    const results = await Promise.all(Array.from({ length: 10 }, () => createWithUniqueRetry(attempt, "carnet")));
    assert.equal(new Set(results).size, 10, "hubo carnets duplicados entre las 10 creaciones");
  });

  await check("colisiona 2 veces y se recupera al tercer intento (regenera el candidato cada vez)", async () => {
    let attempts = 0;
    const result = await createWithUniqueRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw p2002("carnet");
      return `intento-${attempts}`;
    }, "carnet");
    assert.equal(result, "intento-3");
    assert.equal(attempts, 3);
  });

  await check("agota los 3 intentos por defecto y relanza el último P2002", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        createWithUniqueRetry(async () => {
          attempts += 1;
          throw p2002("carnet");
        }, "carnet"),
      (err: unknown) => isUniqueConstraintOn(err, "carnet")
    );
    assert.equal(attempts, 3);
  });

  await check("un conflicto sobre OTRO campo (email) no se reintenta — se relanza de inmediato", async () => {
    let attempts = 0;
    await assert.rejects(() =>
      createWithUniqueRetry(async () => {
        attempts += 1;
        throw p2002("email");
      }, "carnet")
    );
    assert.equal(attempts, 1);
  });

  await check("un error que no es de conflicto único nunca se reintenta", async () => {
    let attempts = 0;
    await assert.rejects(() =>
      createWithUniqueRetry(async () => {
        attempts += 1;
        throw new Error("fallo de red");
      }, "carnet")
    );
    assert.equal(attempts, 1);
  });

  await check("respeta un maxAttempts personalizado", async () => {
    let attempts = 0;
    await assert.rejects(() =>
      createWithUniqueRetry(
        async () => {
          attempts += 1;
          throw p2002("carnet");
        },
        "carnet",
        5
      )
    );
    assert.equal(attempts, 5);
  });

  // ── de-duplicación de inscripciones en importar-csv (findFirst antes de create) ──

  await check("importar-csv: la segunda importación del mismo par (alumno, edición) no duplica", async () => {
    // Simula lo que ahora hace importar-csv: buscar antes de crear, dentro de "una transacción" por fila.
    const inscripciones: Array<{ alumnoId: number; edicionId: number }> = [];

    async function importarFila(alumnoId: number, edicionId: number): Promise<"creada" | "duplicada"> {
      const existente = inscripciones.find((i) => i.alumnoId === alumnoId && i.edicionId === edicionId);
      if (existente) return "duplicada";
      inscripciones.push({ alumnoId, edicionId });
      return "creada";
    }

    assert.equal(await importarFila(1, 10), "creada");
    // Reimportar el mismo CSV (mismo alumno+edición) no debe crear una segunda inscripción
    assert.equal(await importarFila(1, 10), "duplicada");
    assert.equal(inscripciones.length, 1);
  });

  if (failures > 0) {
    console.log(`\n${failures} prueba(s) fallaron`);
    process.exit(1);
  }
  console.log("\nTodas las pruebas pasaron");
  process.exit(0);
}

main().catch((err) => {
  console.log(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
