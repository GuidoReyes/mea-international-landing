/**
 * Prueba de sanitizeForLog / maskPhone y de su uso en el logger.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-log-sanitize.ts
 */
import assert from "node:assert/strict";
import { maskPhone, sanitizeForLog } from "../lib/log-sanitize";
import { log } from "../lib/logger";

const REDACTED = "[REDACTED]";
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

check("redacta campos sensibles anidados", () => {
  const out = sanitizeForLog({ user: { password: "x", name: "ana" } }) as { user: { password: string; name: string } };
  assert.equal(out.user.password, REDACTED);
  assert.equal(out.user.name, "ana");
});

check("no muta el objeto original", () => {
  const original = { user: { password: "x", tags: [{ token: "t" }] } };
  sanitizeForLog(original);
  assert.equal(original.user.password, "x");
  assert.equal(original.user.tags[0].token, "t");
});

check("recorre arreglos", () => {
  const out = sanitizeForLog([{ token: "t" }, { a: 1 }]) as Array<Record<string, unknown>>;
  assert.equal(out[0].token, REDACTED);
  assert.equal(out[1].a, 1);
});

check("cubre variantes de nombre y capitalización", () => {
  const out = sanitizeForLog({
    Authorization: "Bearer x",
    refresh_token: "r",
    accessToken: "a",
    apiKey: "k",
    api_key: "k2",
    newPassword: "p",
    codigoHash: "h",
    codigo: "123456",
    cookie: "c",
    secret: "s",
  }) as Record<string, unknown>;
  for (const value of Object.values(out)) assert.equal(value, REDACTED);
});

check("no redacta campos no sensibles", () => {
  const out = sanitizeForLog({ nombre: "ana", email: "a@b.c", monto: 10 }) as Record<string, unknown>;
  assert.deepEqual(out, { nombre: "ana", email: "a@b.c", monto: 10 });
});

check("deja pasar primitivos", () => {
  assert.equal(sanitizeForLog(null), null);
  assert.equal(sanitizeForLog(5), 5);
  assert.equal(sanitizeForLog("texto"), "texto");
  assert.equal(sanitizeForLog(undefined), undefined);
});

check("Date se serializa como ISO", () => {
  assert.equal(sanitizeForLog(new Date("2026-09-20T00:00:00.000Z")), "2026-09-20T00:00:00.000Z");
});

check("Error expone name, message y code, sin stack en producción", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const err = Object.assign(new Error("boom"), { code: "P2002" });
  const out = sanitizeForLog(err) as Record<string, unknown>;
  process.env.NODE_ENV = previous;
  assert.equal(out.message, "boom");
  assert.equal(out.code, "P2002");
  assert.equal("stack" in out, false);
});

check("Error incluye stack fuera de producción", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const out = sanitizeForLog(new Error("boom")) as Record<string, unknown>;
  process.env.NODE_ENV = previous;
  assert.equal(typeof out.stack, "string");
});

check("no se cuelga con referencias circulares", () => {
  const circular: Record<string, unknown> = { name: "a" };
  circular.self = circular;
  assert.doesNotThrow(() => JSON.stringify(sanitizeForLog(circular)));
});

check("maskPhone deja solo los últimos 4 dígitos", () => {
  assert.equal(maskPhone("50212345678"), "XXX-5678");
  assert.equal(maskPhone("123"), "XXX-123");
  assert.equal(maskPhone(""), "XXX-");
});

check("log() redacta el meta y muestra el mensaje de un Error", () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: string) => lines.push(line);
  try {
    log("error", "fallo", { password: "supersecreto", ok: 1 });
    log("error", "otro", new Error("boom"));
  } finally {
    console.error = original;
  }
  assert.equal(lines[0].includes("supersecreto"), false);
  assert.equal(lines[0].includes(REDACTED), true);
  assert.equal(lines[1].includes("boom"), true);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
