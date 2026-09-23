/**
 * Pruebas de validación del endpoint de prueba /api/test-bot (tarea #497, ronda 2).
 * No importa index.ts (levantaría el servidor real, schedulers incluidos): se prueba
 * el esquema Zod de forma aislada y se verifica por lectura de código que el flag
 * ENABLE_TEST_ENDPOINT y el res.json({error: String(err)}) crudo ya no existen.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-bot-security.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { testBotInputSchema } from "../lib/test-bot-validation";

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

// ── vuln_005: validación de telefono/mensaje ──────────────────────────────────

check("acepta telefono y mensaje válidos", () => {
  const out = testBotInputSchema.safeParse({ telefono: "50212345678", mensaje: "hola" });
  assert.equal(out.success, true);
});

check("rechaza telefono con letras o símbolos", () => {
  assert.equal(testBotInputSchema.safeParse({ telefono: "abc", mensaje: "hola" }).success, false);
  assert.equal(testBotInputSchema.safeParse({ telefono: "+502 1234", mensaje: "hola" }).success, false);
});

check("rechaza telefono muy corto o muy largo", () => {
  assert.equal(testBotInputSchema.safeParse({ telefono: "123", mensaje: "hola" }).success, false);
  assert.equal(testBotInputSchema.safeParse({ telefono: "1".repeat(16), mensaje: "hola" }).success, false);
});

check("rechaza mensaje vacío o mayor a 4096 caracteres", () => {
  assert.equal(testBotInputSchema.safeParse({ telefono: "50212345678", mensaje: "" }).success, false);
  assert.equal(testBotInputSchema.safeParse({ telefono: "50212345678", mensaje: "a".repeat(4097) }).success, false);
});

check("rechaza campos faltantes", () => {
  assert.equal(testBotInputSchema.safeParse({}).success, false);
  assert.equal(testBotInputSchema.safeParse({ telefono: "50212345678" }).success, false);
});

// ── vuln_002 + vuln_004: código real de index.ts ──────────────────────────────

const INDEX_SOURCE = fs.readFileSync(path.join(__dirname, "../index.ts"), "utf-8");

check("vuln_002: ya no existe la bandera ENABLE_TEST_ENDPOINT para forzar el endpoint en producción", () => {
  assert.equal(/ENABLE_TEST_ENDPOINT/.test(INDEX_SOURCE), false);
});

check("vuln_002: el endpoint sigue condicionado solo a NODE_ENV !== production", () => {
  assert.match(INDEX_SOURCE, /process\.env\.NODE_ENV\s*!==\s*"production"/);
});

check("vuln_004: ya no se devuelve el error crudo con String(err) al cliente", () => {
  assert.equal(/res\.status\(500\)\.json\(\{\s*error:\s*String\(err\)/.test(INDEX_SOURCE), false);
});

check("vuln_005: la ruta usa testBotInputSchema antes de procesar la petición", () => {
  assert.match(INDEX_SOURCE, /testBotInputSchema\.safeParse/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
