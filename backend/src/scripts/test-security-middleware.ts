/**
 * Prueba de securityKeyMiddleware (sin servidor, sin red).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-security-middleware.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import { securityKeyMiddleware } from "../security-agent/middleware";

// Random per run: a hardcoded secret in a test file gets copied into real configs
const SECRET = randomBytes(16).toString("hex");

interface Outcome {
  readonly passed: boolean;
  readonly status: number | null;
}

function run(headers: Record<string, string>, query: Record<string, unknown>): Outcome {
  let passed = false;
  let status: number | null = null;

  const req = { headers, query } as unknown as Request;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  securityKeyMiddleware(req, res, () => {
    passed = true;
  });
  return { passed, status };
}

interface Case {
  readonly name: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, unknown>;
  readonly expectPass: boolean;
  readonly expectStatus: number | null;
}

const CASES: readonly Case[] = [
  { name: "sin clave", headers: {}, query: {}, expectPass: false, expectStatus: 403 },
  { name: "clave inválida (header)", headers: { "x-security-key": "wrong" }, query: {}, expectPass: false, expectStatus: 403 },
  { name: "clave inválida (query)", headers: {}, query: { key: "wrong" }, expectPass: false, expectStatus: 403 },
  { name: "clave válida (header)", headers: { "x-security-key": SECRET }, query: {}, expectPass: true, expectStatus: null },
  { name: "clave válida (query)", headers: {}, query: { key: SECRET }, expectPass: true, expectStatus: null },
  { name: "clave + espacios finales (header)", headers: { "x-security-key": `${SECRET}   ` }, query: {}, expectPass: false, expectStatus: 403 },
  { name: "clave + espacios finales (query)", headers: {}, query: { key: `${SECRET}   ` }, expectPass: false, expectStatus: 403 },
  { name: "prefijo de la clave", headers: { "x-security-key": SECRET.slice(0, 8) }, query: {}, expectPass: false, expectStatus: 403 },
  { name: "query como arreglo", headers: {}, query: { key: ["a", "b"] }, expectPass: false, expectStatus: 403 },
];

process.env.SECURITY_DASHBOARD_SECRET = SECRET;

let failures = 0;
for (const c of CASES) {
  const outcome = run(c.headers, c.query);
  try {
    assert.equal(outcome.passed, c.expectPass);
    assert.equal(outcome.status, c.expectStatus);
    console.log(`PASS  ${c.name}`);
  } catch {
    failures += 1;
    console.log(`FAIL  ${c.name} (passed=${outcome.passed}, status=${outcome.status})`);
  }
}

delete process.env.SECURITY_DASHBOARD_SECRET;
const unconfigured = run({ "x-security-key": SECRET }, {});
try {
  assert.equal(unconfigured.passed, false);
  assert.equal(unconfigured.status, 500);
  console.log("PASS  secreto no configurado -> 500");
} catch {
  failures += 1;
  console.log(`FAIL  secreto no configurado (passed=${unconfigured.passed}, status=${unconfigured.status})`);
}

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
