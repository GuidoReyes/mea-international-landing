/**
 * Pruebas de rate limiting, segunda pasada (tarea #501, ronda 2): verificación
 * pública de certificados y reportes financieros.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-rate-limiting-round2.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import type { Request, Response } from "express";
import { certVerifyLimiter, financialReportsLimiter } from "../middleware/rate-limit.middleware";

let failures = 0;

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

// Sin Redis real en este entorno, ResilientStore cae a memoria — mismo comportamiento
// que producción cuando Redis está caído (ver test-rate-limiting.ts).
function makeRes() {
  const result = { status: 200, body: undefined as unknown };
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader() { return this; },
    getHeader: () => undefined,
    status(code: number) { result.status = code; this.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    send(body: unknown) { result.body = body; return this; },
    on() { return this; },
    once() { return this; },
  };
  return { res: res as unknown as Response, result };
}

async function hit(
  limiter: typeof certVerifyLimiter,
  req: Partial<Request>
): Promise<{ passed: boolean; status: number; body: unknown }> {
  const mock = makeRes();
  let passed = false;
  const fullReq = { headers: {}, body: {}, app: { get: () => false }, ...req } as unknown as Request;
  await limiter(fullReq, mock.res, () => {
    passed = true;
  });
  return { passed, status: mock.result.status, body: mock.result.body };
}

async function main(): Promise<void> {
  // ── vuln_020: verificación de certificados, por IP ────────────────────────

  await check("certVerifyLimiter deja pasar peticiones normales y bloquea al superar el tope", async () => {
    const ip = "203.0.113.10";
    let blocked = false;
    for (let i = 0; i < 25 && !blocked; i++) {
      const out = await hit(certVerifyLimiter, { ip });
      if (!out.passed) {
        blocked = true;
        assert.equal(out.status, 429);
      }
    }
    assert.equal(blocked, true, "nunca respondió 429 tras 25 peticiones — el límite no está aplicado");
  });

  await check("certVerifyLimiter tiene contadores independientes por IP", async () => {
    const a = await hit(certVerifyLimiter, { ip: "203.0.113.20" });
    const b = await hit(certVerifyLimiter, { ip: "203.0.113.21" });
    assert.equal(a.passed, true);
    assert.equal(b.passed, true);
  });

  // ── vuln_035: reportes financieros, por admin ──────────────────────────────

  await check("financialReportsLimiter deja pasar peticiones normales y bloquea al superar el tope", async () => {
    const req = { admin: { adminId: 999, rol: "SUPER_ADMIN" } } as unknown as Partial<Request>;
    let blocked = false;
    for (let i = 0; i < 15 && !blocked; i++) {
      const out = await hit(financialReportsLimiter, req);
      if (!out.passed) {
        blocked = true;
        assert.equal(out.status, 429);
      }
    }
    assert.equal(blocked, true, "nunca respondió 429 tras 15 peticiones — el límite no está aplicado");
  });

  await check("financialReportsLimiter separa el contador por adminId, no por IP", async () => {
    const reqA = { ip: "10.0.0.1", admin: { adminId: 1, rol: "SUPER_ADMIN" } } as unknown as Partial<Request>;
    const reqB = { ip: "10.0.0.1", admin: { adminId: 2, rol: "SUPER_ADMIN" } } as unknown as Partial<Request>;
    assert.equal((await hit(financialReportsLimiter, reqA)).passed, true);
    assert.equal((await hit(financialReportsLimiter, reqB)).passed, true);
  });

  // ── las rutas reales usan estos limitadores ───────────────────────────────

  const certSource = fs.readFileSync(path.join(__dirname, "../routes/certificados.ts"), "utf-8");
  await check("GET /verify/:codigo usa certVerifyLimiter", () => {
    assert.match(certSource, /router\.get\(\s*"\/verify\/:codigo",\s*certVerifyLimiter/);
  });

  const reportesSource = fs.readFileSync(path.join(__dirname, "../routes/reportes.ts"), "utf-8");
  await check("los 3 endpoints financieros de SUPER_ADMIN usan financialReportsLimiter", () => {
    const matches = reportesSource.match(/financialReportsLimiter/g) ?? [];
    // 1 en el import + 1 por cada ruta (pl, proyecciones, flujo-caja)
    assert.equal(matches.length, 4, `se esperaban 4 apariciones, hubo ${matches.length}`);
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
