/**
 * Pruebas del bridge de JARVIS (tarea #502, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-jarvis-bridge.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { isValidBridgeToken } from "../routes/jarvis-bridge";

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

// ── vuln_030: JARVIS_BRIDGE_TOKEN debe tener un largo mínimo ─────────────────

check("isValidBridgeToken rechaza undefined y string vacío", () => {
  assert.equal(isValidBridgeToken(undefined), false);
  assert.equal(isValidBridgeToken(""), false);
});

check("isValidBridgeToken rechaza un token corto (< 32 caracteres)", () => {
  assert.equal(isValidBridgeToken("abc"), false);
  assert.equal(isValidBridgeToken("a".repeat(31)), false);
});

check("isValidBridgeToken acepta un token de 32+ caracteres", () => {
  assert.equal(isValidBridgeToken("a".repeat(32)), true);
  assert.equal(isValidBridgeToken("a".repeat(64)), true);
});

// ── el chequeo real corre en cada request, no al importar el módulo ──────────

const SOURCE = fs.readFileSync(path.join(__dirname, "../routes/jarvis-bridge.ts"), "utf-8");

check("jarvisAuth usa isValidBridgeToken en vez de solo comprobar presencia", () => {
  assert.match(SOURCE, /isValidBridgeToken\(expected\)/);
});

// ── vuln_031: decisión documentada (riesgo aceptado, no se filtra contenido) ─

check("la decisión de no filtrar el contenido de conversaciones queda documentada", () => {
  assert.match(SOURCE, /vuln_031 \(riesgo aceptado/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
