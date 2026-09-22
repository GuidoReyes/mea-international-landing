/**
 * Pruebas de la autenticación por sesión del dashboard de seguridad (tarea 477, decisión D1).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-security-session.ts
 */
import assert from "node:assert/strict";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { Request, Response } from "express";

const SECRET = crypto.randomBytes(16).toString("hex");
const OTHER_SECRET = crypto.randomBytes(16).toString("hex");
process.env.SECURITY_DASHBOARD_SECRET = SECRET;
process.env.REDIS_URL = "redis://127.0.0.1:1"; // el router importa el cliente de Redis: que falle rápido

/* eslint-disable @typescript-eslint/no-require-imports */
const session = require("../security-agent/session");
const { authorize, securityKeyMiddleware } = require("../security-agent/middleware");
const routes = require("../routes/security.routes");
const { DASHBOARD_CSP, dashboardHeaders } = require("../security-agent/headers");

const router = routes.default;
const DASHBOARD_DIR = path.join(__dirname, "../security-agent/dashboard");
const read = (file: string): string => fs.readFileSync(path.join(DASHBOARD_DIR, file), "utf-8");

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

interface ReqOptions {
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  cookies?: Record<string, string>;
  method?: string;
}

const makeReq = (o: ReqOptions = {}): Request =>
  ({ headers: o.headers ?? {}, query: o.query ?? {}, cookies: o.cookies ?? {}, method: o.method ?? "GET" }) as unknown as Request;

interface MockRes {
  res: Response;
  state: { status: number | null; body: unknown; redirect: string | null; sentFile: string | null; cookie: { name: string; value: string; options: Record<string, unknown> } | null; headers: Record<string, string> };
}

function makeRes(): MockRes {
  const state: MockRes["state"] = { status: null, body: undefined, redirect: null, sentFile: null, cookie: null, headers: {} };
  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
    redirect(target: string) {
      state.redirect = target;
      return this;
    },
    sendFile(file: string) {
      state.sentFile = file;
      return this;
    },
    cookie(name: string, value: string, options: Record<string, unknown>) {
      state.cookie = { name, value, options };
      return this;
    },
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return this;
    },
  };
  return { res: res as unknown as Response, state };
}

function runMiddleware(req: Request): { passed: boolean; status: number | null } {
  const { res, state } = makeRes();
  let passed = false;
  securityKeyMiddleware(req, res, () => {
    passed = true;
  });
  return { passed, status: state.status };
}

const validCookie = (): Record<string, string> => ({ [session.SESSION_COOKIE]: session.createSessionToken(SECRET) });

// ── Token de sesión ──────────────────────────────────────────────────────────

check("sesión: un token recién creado se verifica", () => {
  assert.equal(session.verifySessionToken(session.createSessionToken(SECRET), SECRET), true);
});

check("sesión: un token vencido no se verifica", () => {
  const token = session.createSessionToken(SECRET, 1_000_000);
  assert.equal(session.verifySessionToken(token, SECRET, 1_000_000 + session.SESSION_TTL_MS + 1), false);
  assert.equal(session.verifySessionToken(token, SECRET, 1_000_000 + session.SESSION_TTL_MS - 1), true);
});

check("sesión: una firma alterada no se verifica", () => {
  const token = session.createSessionToken(SECRET) as string;
  const [expires, signature] = token.split(".");
  const tampered = `${expires}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(session.verifySessionToken(tampered, SECRET), false);
});

check("sesión: alargar la expiración invalida la firma", () => {
  const token = session.createSessionToken(SECRET) as string;
  const [expires, signature] = token.split(".");
  assert.equal(session.verifySessionToken(`${Number(expires) + 86_400_000}.${signature}`, SECRET), false);
});

check("sesión: un token firmado con otro secreto no se verifica", () => {
  assert.equal(session.verifySessionToken(session.createSessionToken(OTHER_SECRET), SECRET), false);
});

check("sesión: basura, vacío o tipos incorrectos no se verifican", () => {
  for (const bad of [undefined, null, 5, {}, "", "abc", "1.2.3", ".", "123.", ".abc", "x.y"]) {
    assert.equal(session.verifySessionToken(bad, SECRET), false);
  }
});

check("cookie: httpOnly, SameSite=Strict, ruta raíz y expiración de 30 minutos", () => {
  const options = session.sessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "strict");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, 30 * 60 * 1000);
});

check("cookie: Secure solo en producción", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(session.sessionCookieOptions().secure, true);
  process.env.NODE_ENV = "development";
  assert.equal(session.sessionCookieOptions().secure, false);
  process.env.NODE_ENV = previous;
});

// ── Middleware ───────────────────────────────────────────────────────────────

check("middleware: header con la clave correcta pasa", () => {
  assert.equal(runMiddleware(makeReq({ headers: { "x-security-key": SECRET } })).passed, true);
});

check("middleware: header con clave incorrecta -> 403", () => {
  const out = runMiddleware(makeReq({ headers: { "x-security-key": "mala" } }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("middleware: sin clave ni cookie -> 403", () => {
  const out = runMiddleware(makeReq());
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("middleware: ?key= con la clave correcta se rechaza por completo -> 403", () => {
  const out = runMiddleware(makeReq({ query: { key: SECRET } }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("middleware: cookie de sesión válida pasa", () => {
  assert.equal(runMiddleware(makeReq({ cookies: validCookie() })).passed, true);
});

check("middleware: cookie vencida -> 403", () => {
  const expired = session.createSessionToken(SECRET, Date.now() - session.SESSION_TTL_MS - 5_000);
  const out = runMiddleware(makeReq({ cookies: { [session.SESSION_COOKIE]: expired } }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("middleware: cookie firmada con otro secreto -> 403", () => {
  const forged = session.createSessionToken(OTHER_SECRET);
  assert.equal(runMiddleware(makeReq({ cookies: { [session.SESSION_COOKIE]: forged } })).passed, false);
});

check("middleware: un header incorrecto manda aunque haya cookie válida", () => {
  const out = runMiddleware(makeReq({ headers: { "x-security-key": "mala" }, cookies: validCookie() }));
  assert.equal(out.passed, false);
});

check("CSRF: cookie + POST desde otro sitio (same-site) -> 403", () => {
  const out = runMiddleware(makeReq({ method: "POST", cookies: validCookie(), headers: { "sec-fetch-site": "same-site" } }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("CSRF: cookie + POST cross-site -> 403", () => {
  const out = runMiddleware(makeReq({ method: "POST", cookies: validCookie(), headers: { "sec-fetch-site": "cross-site" } }));
  assert.equal(out.passed, false);
});

check("CSRF: cookie + POST del mismo origen pasa", () => {
  assert.equal(runMiddleware(makeReq({ method: "POST", cookies: validCookie(), headers: { "sec-fetch-site": "same-origin" } })).passed, true);
});

check("CSRF: cookie + GET cross-site también se bloquea (SameSite=Strict nunca la manda igual)", () => {
  const out = runMiddleware(makeReq({ method: "GET", cookies: validCookie(), headers: { "sec-fetch-site": "cross-site" } }));
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("CSRF: la clave en header + POST cross-site pasa (clientes de API, sin cookie)", () => {
  assert.equal(runMiddleware(makeReq({ method: "POST", headers: { "x-security-key": SECRET, "sec-fetch-site": "cross-site" } })).passed, true);
});

check("middleware: sin SECURITY_DASHBOARD_SECRET -> 500", () => {
  delete process.env.SECURITY_DASHBOARD_SECRET;
  const out = runMiddleware(makeReq({ headers: { "x-security-key": SECRET } }));
  process.env.SECURITY_DASHBOARD_SECRET = SECRET;
  assert.equal(out.passed, false);
  assert.equal(out.status, 500);
});

check("authorize distingue el motivo", () => {
  assert.equal(authorize(makeReq({ headers: { "x-security-key": SECRET } })), "ok");
  assert.equal(authorize(makeReq({ headers: { "x-security-key": "mala" } })), "invalid");
  assert.equal(authorize(makeReq()), "missing");
});

// ── Rutas ────────────────────────────────────────────────────────────────────

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

function handlersOf(method: "get" | "post", routePath: string): unknown[] {
  const layers = (router as unknown as { stack: RouteLayer[] }).stack;
  const layer = layers.find((l) => l.route?.path === routePath && l.route.methods[method]);
  return layer?.route?.stack.map((s) => s.handle) ?? [];
}

check("ruta: /security/assets/app.js exige autenticación (vuln_028)", () => {
  assert.ok(handlersOf("get", "/security/assets/app.js").includes(securityKeyMiddleware));
});

check("ruta: /security/assets/styles.css exige autenticación (vuln_028)", () => {
  assert.ok(handlersOf("get", "/security/assets/styles.css").includes(securityKeyMiddleware));
});

check("ruta: la página de acceso y su script son públicos", () => {
  assert.ok(handlersOf("get", "/security/login").length > 0);
  assert.ok(handlersOf("get", "/security/login.js").length > 0);
  assert.equal(handlersOf("get", "/security/login").includes(securityKeyMiddleware), false);
  assert.equal(handlersOf("get", "/security/login.js").includes(securityKeyMiddleware), false);
});

check("ruta: existe POST /api/security/login", () => {
  assert.ok(handlersOf("post", "/api/security/login").length > 0);
});

check("página: /security sin sesión redirige al login", () => {
  const { res, state } = makeRes();
  routes.dashboardPage(makeReq(), res);
  assert.equal(state.redirect, "/security/login");
  assert.equal(state.sentFile, null);
});

check("página: /security con ?key= válido igualmente redirige al login", () => {
  const { res, state } = makeRes();
  routes.dashboardPage(makeReq({ query: { key: SECRET } }), res);
  assert.equal(state.redirect, "/security/login");
});

check("página: /security con sesión válida sirve el dashboard", () => {
  const { res, state } = makeRes();
  routes.dashboardPage(makeReq({ cookies: validCookie() }), res);
  assert.equal(state.redirect, null);
  assert.ok(state.sentFile?.endsWith("index.html"));
});

check("login: clave válida en el header crea la cookie de sesión", () => {
  const { res, state } = makeRes();
  routes.loginHandler(makeReq({ method: "POST", headers: { "x-security-key": SECRET } }), res);
  assert.equal(state.cookie?.name, session.SESSION_COOKIE);
  assert.equal(state.cookie?.options.httpOnly, true);
  assert.equal(state.cookie?.options.sameSite, "strict");
  assert.equal(session.verifySessionToken(state.cookie?.value, SECRET), true);
  assert.notEqual(state.status, 403);
});

check("login: clave inválida -> 403 y sin cookie", () => {
  const { res, state } = makeRes();
  routes.loginHandler(makeReq({ method: "POST", headers: { "x-security-key": "mala" } }), res);
  assert.equal(state.status, 403);
  assert.equal(state.cookie, null);
});

check("login: ignora la clave si llega por query", () => {
  const { res, state } = makeRes();
  routes.loginHandler(makeReq({ method: "POST", query: { key: SECRET } }), res);
  assert.equal(state.status, 403);
  assert.equal(state.cookie, null);
});

check("login: sin SECURITY_DASHBOARD_SECRET -> 500", () => {
  delete process.env.SECURITY_DASHBOARD_SECRET;
  const { res, state } = makeRes();
  routes.loginHandler(makeReq({ method: "POST", headers: { "x-security-key": SECRET } }), res);
  process.env.SECURITY_DASHBOARD_SECRET = SECRET;
  assert.equal(state.status, 500);
  assert.equal(state.cookie, null);
});

// ── Cabeceras ────────────────────────────────────────────────────────────────

check("cabeceras: CSP restrictiva y sin caché", () => {
  const { res, state } = makeRes();
  let passed = false;
  dashboardHeaders(makeReq(), res, () => {
    passed = true;
  });
  assert.equal(passed, true);
  assert.equal(state.headers["content-security-policy"], DASHBOARD_CSP);
  assert.equal(state.headers["cache-control"], "no-store");
});

check("CSP: scripts solo propios, sin 'unsafe-inline' ni 'unsafe-eval', y sin marcos", () => {
  assert.match(DASHBOARD_CSP, /script-src 'self'(;|$)/);
  assert.equal(/script-src[^;]*unsafe-/.test(DASHBOARD_CSP), false);
  assert.match(DASHBOARD_CSP, /frame-ancestors 'none'/);
  assert.match(DASHBOARD_CSP, /object-src 'none'/);
  assert.match(DASHBOARD_CSP, /connect-src 'self'/);
});

// ── Archivos estáticos del dashboard ─────────────────────────────────────────

check("app.js no usa sessionStorage", () => {
  assert.equal(/sessionStorage/.test(read("app.js")), false);
});

check("app.js no lee la clave de la URL ni envía X-Security-Key", () => {
  const source = read("app.js");
  assert.equal(/URLSearchParams|location\.search/.test(source), false);
  assert.equal(/x-security-key/i.test(source), false);
});

check("app.js no usa manejadores en línea (incompatibles con la CSP)", () => {
  assert.equal(/\bon(click|change|input|error|load)\s*=/.test(read("app.js")), false);
});

check("app.js redirige al login cuando la sesión no es válida", () => {
  assert.match(read("app.js"), /\/security\/login/);
});

check("index.html ya no incluye la compuerta de clave ni scripts en línea", () => {
  const html = read("index.html");
  assert.equal(/keyGate|keyInput|keySubmit/.test(html), false);
  assert.equal(/<script(?![^>]*\bsrc=)/i.test(html), false);
});

check("login.html: sin recursos externos ni scripts en línea, carga /security/login.js", () => {
  const html = read("login.html");
  assert.equal(/https?:\/\//i.test(html), false);
  assert.equal(/<script(?![^>]*\bsrc=)/i.test(html), false);
  assert.match(html, /src="\/security\/login\.js"/);
});

check("login.js envía la clave en el header y no la guarda en el navegador", () => {
  const source = read("login.js");
  assert.match(source, /\/api\/security\/login/);
  assert.match(source, /X-Security-Key/);
  assert.equal(/sessionStorage|localStorage|document\.cookie/.test(source), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
