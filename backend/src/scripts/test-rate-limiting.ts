/**
 * Pruebas de rate limiting (tarea 475): store con Redis y fallback a memoria, y limitadores.
 * No usa Redis real: se inyecta un cliente falso compartido entre "instancias".
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-rate-limiting.ts
 */
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import type { Options } from "express-rate-limit";
import { ResilientStore, createLimiter, readPositiveInt, type RedisLike } from "../lib/rate-limit-store";

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
  failing = false;
  private readonly data = new Map<string, { value: number; expiresAt: number | null }>();

  private guard(): void {
    if (this.failing) throw new Error("redis down");
  }

  private live(key: string): { value: number; expiresAt: number | null } | undefined {
    const entry = this.data.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string): Promise<number> {
    this.guard();
    const entry = this.live(key);
    const value = (entry?.value ?? 0) + 1;
    this.data.set(key, { value, expiresAt: entry?.expiresAt ?? null });
    return value;
  }

  async decr(key: string): Promise<number> {
    this.guard();
    const entry = this.live(key);
    const value = (entry?.value ?? 0) - 1;
    this.data.set(key, { value, expiresAt: entry?.expiresAt ?? null });
    return value;
  }

  async pTTL(key: string): Promise<number> {
    this.guard();
    const entry = this.live(key);
    if (!entry) return -2;
    return entry.expiresAt === null ? -1 : entry.expiresAt - Date.now();
  }

  async pExpire(key: string, ms: number): Promise<number> {
    this.guard();
    const entry = this.live(key);
    if (!entry) return 0;
    this.data.set(key, { value: entry.value, expiresAt: Date.now() + ms });
    return 1;
  }

  async del(key: string): Promise<number> {
    this.guard();
    return this.data.delete(key) ? 1 : 0;
  }

  /** Simula una clave que perdió su expiración (proceso caído entre INCR y PEXPIRE). */
  dropExpiry(key: string): void {
    const entry = this.data.get(key);
    if (entry) this.data.set(key, { value: entry.value, expiresAt: null });
  }
}

function newStore(redis: RedisLike, prefix = "test:"): ResilientStore {
  const store = new ResilientStore(prefix, redis);
  store.init({ windowMs: WINDOW_MS } as Options);
  return store;
}

interface MockRes {
  readonly res: Response;
  readonly result: { status: number; body: unknown };
  finish(statusCode: number): Promise<void>;
}

function makeRes(): MockRes {
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
    // express-rate-limit registra "finish" con once() para decidir si descuenta el acierto
    once(event: string, cb: () => void) {
      (listeners[event] ??= []).push(cb);
      return this;
    },
  };
  return {
    res: res as unknown as Response,
    result,
    // Los listeners de la librería son asíncronos (descuentan en el store): hay que dejarlos terminar
    async finish(statusCode: number) {
      res.statusCode = statusCode;
      for (const cb of listeners["finish"] ?? []) cb();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

async function hit(
  limiter: ReturnType<typeof createLimiter>,
  ip: string
): Promise<{ passed: boolean; status: number; body: unknown; finish: (code: number) => Promise<void> }> {
  const mock = makeRes();
  let passed = false;
  const req = { ip, headers: {}, body: {}, app: { get: () => false } } as unknown as Request;
  await limiter(req, mock.res, () => {
    passed = true;
  });
  return { passed, status: mock.result.status, body: mock.result.body, finish: mock.finish };
}

async function main(): Promise<void> {
  await check("store: incrementa el contador y da un resetTime futuro", async () => {
    const store = newStore(new FakeRedis());
    const first = await store.increment("ip-1");
    const second = await store.increment("ip-1");
    assert.equal(first.totalHits, 1);
    assert.equal(second.totalHits, 2);
    assert.ok((second.resetTime as Date).getTime() > Date.now());
  });

  await check("store: dos instancias comparten el contador vía Redis", async () => {
    const redis = new FakeRedis();
    const a = newStore(redis);
    const b = newStore(redis);
    await a.increment("ip-1");
    await a.increment("ip-1");
    const fromB = await b.increment("ip-1");
    assert.equal(fromB.totalHits, 3);
  });

  await check("store: sin Redis listo usa memoria y no lanza", async () => {
    const redis = new FakeRedis();
    redis.isReady = false;
    const store = newStore(redis);
    // MemoryStore devuelve su objeto interno mutable: hay que leer totalHits al instante
    const first = (await store.increment("ip-1")).totalHits;
    const second = (await store.increment("ip-1")).totalHits;
    assert.equal(first, 1);
    assert.equal(second, 2);
  });

  await check("store: si Redis falla a mitad de la operación usa memoria", async () => {
    const redis = new FakeRedis();
    redis.failing = true;
    const store = newStore(redis);
    const out = await store.increment("ip-1");
    assert.equal(out.totalHits, 1);
  });

  await check("store: reanuda con Redis cuando vuelve a estar listo", async () => {
    const redis = new FakeRedis();
    const store = newStore(redis);
    redis.isReady = false;
    await store.increment("ip-1");
    redis.isReady = true;
    const back = await store.increment("ip-1");
    assert.equal(back.totalHits, 1); // contador nuevo en Redis, no el de memoria
  });

  await check("store: autocorrige una clave que perdió su expiración", async () => {
    const redis = new FakeRedis();
    const store = newStore(redis);
    await store.increment("ip-1");
    redis.dropExpiry("test:ip-1");
    assert.equal(await redis.pTTL("test:ip-1"), -1);
    await store.increment("ip-1");
    assert.ok((await redis.pTTL("test:ip-1")) > 0);
  });

  await check("store: decrement y resetKey", async () => {
    const store = newStore(new FakeRedis());
    await store.increment("ip-1");
    await store.increment("ip-1");
    await store.decrement("ip-1");
    assert.equal((await store.increment("ip-1")).totalHits, 2);
    await store.resetKey("ip-1");
    assert.equal((await store.increment("ip-1")).totalHits, 1);
  });

  await check("limitador: pasa bajo el límite y responde 429 al superarlo", async () => {
    const limiter = createLimiter(
      { name: "t1", windowMs: WINDOW_MS, limit: 3, message: "Demasiados intentos" },
      { store: newStore(new FakeRedis(), "t1:"), validate: false }
    );
    for (let i = 0; i < 3; i += 1) assert.equal((await hit(limiter, "1.1.1.1")).passed, true);
    const blocked = await hit(limiter, "1.1.1.1");
    assert.equal(blocked.passed, false);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, { error: "Demasiados intentos" });
  });

  await check("limitador: claves distintas tienen contadores independientes", async () => {
    const limiter = createLimiter(
      { name: "t2", windowMs: WINDOW_MS, limit: 1, message: "x" },
      { store: newStore(new FakeRedis(), "t2:"), validate: false }
    );
    assert.equal((await hit(limiter, "1.1.1.1")).passed, true);
    assert.equal((await hit(limiter, "2.2.2.2")).passed, true);
    assert.equal((await hit(limiter, "1.1.1.1")).passed, false);
  });

  await check("limitador: skipSuccessfulRequests solo cuenta las respuestas con error", async () => {
    const limiter = createLimiter(
      { name: "t3", windowMs: WINDOW_MS, limit: 2, message: "x", skipSuccessfulRequests: true },
      { store: newStore(new FakeRedis(), "t3:"), validate: false }
    );
    for (let i = 0; i < 5; i += 1) {
      const ok = await hit(limiter, "1.1.1.1");
      assert.equal(ok.passed, true);
      await ok.finish(200);
    }
    const fail1 = await hit(limiter, "1.1.1.1");
    await fail1.finish(403);
    const fail2 = await hit(limiter, "1.1.1.1");
    await fail2.finish(403);
    assert.equal((await hit(limiter, "1.1.1.1")).passed, false);
  });

  await check("limitador: skip omite la petición", async () => {
    const limiter = createLimiter(
      { name: "t4", windowMs: WINDOW_MS, limit: 1, message: "x", skip: () => true },
      { store: newStore(new FakeRedis(), "t4:"), validate: false }
    );
    for (let i = 0; i < 4; i += 1) assert.equal((await hit(limiter, "1.1.1.1")).passed, true);
  });

  await check("readPositiveInt: usa el valor válido o el de respaldo", () => {
    assert.equal(readPositiveInt("15", 5), 15);
    assert.equal(readPositiveInt(undefined, 5), 5);
    assert.equal(readPositiveInt("", 5), 5);
    assert.equal(readPositiveInt("abc", 5), 5);
    assert.equal(readPositiveInt("0", 5), 5);
    assert.equal(readPositiveInt("-3", 5), 5);
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
