/**
 * Prueba de regresion: alumnoLoginLimiter debia contar por alumno, no por IP.
 * Bug real en produccion (2026-09-28): dos alumnos detras de la misma IP
 * (cyber, colegio, NAT compartido) compartian las 5 solicitudes/minuto de
 * /login, /registro, /otp/solicitar y /otp/verificar -- los intentos de uno
 * bloqueaban al otro.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-alumno-login-independencia.ts
 */
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import type { Options } from "express-rate-limit";
import { ResilientStore, createLimiter, type RedisLike } from "../lib/rate-limit-store";

// Copia local de backend/src/middleware/rate-limit.middleware.ts:porIdentificadorAlumno.
// No se importa ese módulo directamente porque también importa ../lib/redis, que
// intenta conectarse a un Redis real al cargarse (igual que el test hermano
// test-rate-limiting.ts, que por el mismo motivo tampoco importa la capa de
// middleware). Si cambia la función real, actualizar esta copia.
function porIdentificadorAlumno(req: Request): string {
  const body = req.body as { email?: string; whatsapp?: string } | undefined;
  const identificador = body?.email?.trim().toLowerCase() || body?.whatsapp?.trim();
  return identificador ? `id:${identificador}` : `ip:${req.ip}`;
}

const WINDOW_MS = 60_000;
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

class FakeRedis implements RedisLike {
  isReady = true;
  private readonly data = new Map<string, { value: number; expiresAt: number | null }>();

  private live(key: string) {
    const entry = this.data.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string): Promise<number> {
    const entry = this.live(key);
    const value = (entry?.value ?? 0) + 1;
    this.data.set(key, { value, expiresAt: entry?.expiresAt ?? null });
    return value;
  }

  async decr(key: string): Promise<number> {
    const entry = this.live(key);
    const value = (entry?.value ?? 0) - 1;
    this.data.set(key, { value, expiresAt: entry?.expiresAt ?? null });
    return value;
  }

  async pTTL(key: string): Promise<number> {
    const entry = this.live(key);
    if (!entry) return -2;
    return entry.expiresAt === null ? -1 : entry.expiresAt - Date.now();
  }

  async pExpire(key: string, ms: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    this.data.set(key, { value: entry.value, expiresAt: Date.now() + ms });
    return 1;
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

function newStore(redis: RedisLike, prefix = "test:"): ResilientStore {
  const store = new ResilientStore(prefix, redis);
  store.init({ windowMs: WINDOW_MS } as Options);
  return store;
}

function makeRes() {
  const listeners: Record<string, Array<() => void>> = {};
  const headers: Record<string, unknown> = {};
  const result = { status: 200, body: undefined as unknown };
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader(name: string, value: unknown) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    status(code: number) {
      result.status = code;
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
    send(body: unknown) {
      result.body = body;
      return this;
    },
    on(event: string, cb: () => void) {
      (listeners[event] ??= []).push(cb);
      return this;
    },
    once(event: string, cb: () => void) {
      (listeners[event] ??= []).push(cb);
      return this;
    },
  };
  return {
    res: res as unknown as Response,
    result,
    async finish(statusCode: number) {
      res.statusCode = statusCode;
      for (const cb of listeners["finish"] ?? []) cb();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

async function hit(
  limiter: ReturnType<typeof createLimiter>,
  ip: string,
  body: Record<string, unknown> = {}
): Promise<{ passed: boolean; status: number }> {
  const mock = makeRes();
  let passed = false;
  const req = { ip, headers: {}, body, app: { get: () => false } } as unknown as Request;
  await limiter(req, mock.res, () => {
    passed = true;
  });
  return { passed, status: mock.result.status };
}

async function main(): Promise<void> {
  await check("porIdentificadorAlumno: usa email normalizado cuando viene en el body", () => {
    const req = { body: { email: "  Alumno@Ejemplo.com " } } as unknown as Request;
    assert.equal(porIdentificadorAlumno(req), "id:alumno@ejemplo.com");
  });

  await check("porIdentificadorAlumno: usa whatsapp cuando no hay email", () => {
    const req = { body: { whatsapp: "50212345678" } } as unknown as Request;
    assert.equal(porIdentificadorAlumno(req), "id:50212345678");
  });

  await check("porIdentificadorAlumno: cae a IP si el body no trae email ni whatsapp", () => {
    const req = { body: {}, ip: "1.2.3.4", headers: {} } as unknown as Request;
    assert.ok(porIdentificadorAlumno(req).includes("1.2.3.4"));
  });

  await check("limitador: dos alumnos distintos detras de la misma IP no se bloquean entre si", async () => {
    const limiter = createLimiter(
      { name: "t-alumno-1", windowMs: WINDOW_MS, limit: 1, message: "x", keyGenerator: porIdentificadorAlumno },
      { store: newStore(new FakeRedis(), "t-alumno-1:"), validate: false }
    );
    const mismaIp = "10.0.0.1";
    const alumnoA = await hit(limiter, mismaIp, { email: "a@mea.edu.gt" });
    const alumnoB = await hit(limiter, mismaIp, { email: "b@mea.edu.gt" });
    assert.equal(alumnoA.passed, true, "el alumno A debe pasar");
    assert.equal(alumnoB.passed, true, "el alumno B no debe verse afectado por el intento de A");
  });

  await check("limitador: el mismo alumno sigue limitado aunque cambie de IP", async () => {
    const limiter = createLimiter(
      { name: "t-alumno-2", windowMs: WINDOW_MS, limit: 1, message: "x", keyGenerator: porIdentificadorAlumno },
      { store: newStore(new FakeRedis(), "t-alumno-2:"), validate: false }
    );
    const primero = await hit(limiter, "10.0.0.1", { whatsapp: "50255555555" });
    const segundo = await hit(limiter, "10.0.0.2", { whatsapp: "50255555555" });
    assert.equal(primero.passed, true);
    assert.equal(segundo.passed, false, "el mismo alumno no debe evadir el limite cambiando de IP");
    assert.equal(segundo.status, 429);
  });

  await check("limitador: sin email/whatsapp en el body, cae al comportamiento anterior (por IP)", async () => {
    const limiter = createLimiter(
      { name: "t-alumno-3", windowMs: WINDOW_MS, limit: 1, message: "x", keyGenerator: porIdentificadorAlumno },
      { store: newStore(new FakeRedis(), "t-alumno-3:"), validate: false }
    );
    const primero = await hit(limiter, "10.0.0.1", {});
    const segundo = await hit(limiter, "10.0.0.1", {});
    assert.equal(primero.passed, true);
    assert.equal(segundo.passed, false);
  });

  console.log(failures === 0 ? "\nTodas las pruebas pasaron." : `\n${failures} prueba(s) fallaron.`);
  if (failures > 0) process.exit(1);
}

void main();
