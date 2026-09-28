/**
 * Pruebas de TTL/LRU en scanStates y del flag Secure de la cookie de sesión
 * (tarea #505, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-security-agent-memory.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import {
  scanStates,
  setScanState,
  pruneScanStates,
  MAX_SCAN_STATES,
  SCAN_STATE_TTL_MS,
} from "../routes/security.routes";
import { sessionCookieOptions } from "../security-agent/session";

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

// ── vuln_039: scanStates no crece sin límite ──────────────────────────────────

check("setScanState no deja crecer el Map más allá de MAX_SCAN_STATES", () => {
  scanStates.clear();
  const now = Date.now();
  for (let i = 0; i < MAX_SCAN_STATES + 500; i++) {
    setScanState(`scan-${i}`, { status: "COMPLETED", progress: 100 }, now);
  }
  assert.ok(scanStates.size <= MAX_SCAN_STATES, `size=${scanStates.size}, esperado <= ${MAX_SCAN_STATES}`);
});

check("al superar el tope, se descartan las entradas más viejas primero (LRU por orden de inserción)", () => {
  scanStates.clear();
  const now = Date.now();
  for (let i = 0; i < MAX_SCAN_STATES + 1; i++) {
    setScanState(`scan-${i}`, { status: "COMPLETED" }, now);
  }
  assert.equal(scanStates.has("scan-0"), false, "la entrada más vieja debería haberse descartado");
  assert.equal(scanStates.has(`scan-${MAX_SCAN_STATES}`), true, "la entrada más nueva debería seguir");
});

check("pruneScanStates elimina entradas más viejas que el TTL", () => {
  scanStates.clear();
  const start = Date.now();
  setScanState("scan-viejo", { status: "COMPLETED" }, start);
  setScanState("scan-nuevo", { status: "COMPLETED" }, start);
  pruneScanStates(start + SCAN_STATE_TTL_MS + 1);
  assert.equal(scanStates.has("scan-viejo"), false);
  assert.equal(scanStates.has("scan-nuevo"), false); // ambas tienen el mismo updatedAt en esta prueba
});

check("una entrada reciente sobrevive una poda dentro del TTL", () => {
  scanStates.clear();
  const start = Date.now();
  setScanState("scan-reciente", { status: "RUNNING", progress: 50 }, start);
  pruneScanStates(start + SCAN_STATE_TTL_MS - 1000);
  assert.equal(scanStates.has("scan-reciente"), true);
});

check("GET /status no expone el campo interno updatedAt (contrato público sin cambios)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../routes/security.routes.ts"), "utf-8");
  assert.match(src, /const \{ updatedAt: _updatedAt, \.\.\.state \} = entry;/);
});

// ── vuln_056: falso positivo confirmado — secure ya depende de NODE_ENV ──────

check("sessionCookieOptions: secure=false en desarrollo, secure=true en producción", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    assert.equal(sessionCookieOptions().secure, false);
    process.env.NODE_ENV = "production";
    assert.equal(sessionCookieOptions().secure, true);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

scanStates.clear();

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
