/**
 * Pruebas de control de acceso (tarea 482): verifyJWT, GET de ediciones y estado de pago.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-access-control.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

// Aleatorio por corrida: un secreto fijo en un archivo de prueba puede terminar
// copiado a una config real (vuln_047 del re-scan).
const TEST_JWT_SECRET = randomBytes(32).toString("hex");
process.env.JWT_SECRET = TEST_JWT_SECRET;

import { verifyJWT } from "../middleware/auth.middleware";
import edicionesRouter from "../routes/ediciones";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.split("\n")[0] : String(err)})`);
  }
}

function runVerifyJWT(authorization?: string): { passed: boolean; status: number | null } {
  let passed = false;
  let status: number | null = null;
  const req = { headers: authorization ? { authorization } : {}, cookies: {} } as unknown as Request;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  verifyJWT(req, res, () => {
    passed = true;
  });
  return { passed, status };
}

const sign = (payload: object, secret = TEST_JWT_SECRET): string => `Bearer ${jwt.sign(payload, secret)}`;

check("verifyJWT acepta un token de admin", () => {
  const out = runVerifyJWT(sign({ adminId: 1, email: "a@b.c", rol: "ADMIN" }));
  assert.equal(out.passed, true);
});

check("verifyJWT rechaza un token de alumno (alumnoId, sin adminId)", () => {
  const out = runVerifyJWT(sign({ alumnoId: 7, email: "alumno@b.c" }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 401);
});

check("verifyJWT rechaza sin token", () => {
  const out = runVerifyJWT();
  assert.equal(out.passed, false);
  assert.equal(out.status, 401);
});

check("verifyJWT rechaza un token firmado con otro secreto", () => {
  const out = runVerifyJWT(sign({ adminId: 1, email: "a@b.c", rol: "ADMIN" }, "otro-secreto"));
  assert.equal(out.passed, false);
  assert.equal(out.status, 401);
});

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

function getHandlers(path: string): unknown[] {
  const layers = (edicionesRouter as unknown as { stack: RouteLayer[] }).stack;
  const layer = layers.find((l) => l.route?.path === path && l.route.methods.get);
  return layer?.route?.stack.map((s) => s.handle) ?? [];
}

check("GET /api/ediciones exige verifyJWT", () => {
  assert.ok(getHandlers("/").includes(verifyJWT));
});

check("GET /api/ediciones/:id exige verifyJWT", () => {
  assert.ok(getHandlers("/:id").includes(verifyJWT));
});

check("puedeSubirComprobante: solo pagos que aún no están cerrados", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { puedeSubirComprobante } = require("../lib/pago-estado") as {
    puedeSubirComprobante: (estado: string) => boolean;
  };
  assert.equal(puedeSubirComprobante("PENDIENTE"), true);
  assert.equal(puedeSubirComprobante("RECHAZADO"), true);
  assert.equal(puedeSubirComprobante("VENCIDO"), true);
  assert.equal(puedeSubirComprobante("COMPLETADO"), false);
  assert.equal(puedeSubirComprobante("REEMBOLSADO"), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
