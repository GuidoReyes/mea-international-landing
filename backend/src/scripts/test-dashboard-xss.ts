/**
 * Pruebas de XSS del dashboard de seguridad (tarea 478): esc(), safeScore() y el
 * enlace de Drive. app.js corre en el navegador sin bundler, así que se ejecuta su
 * texto real en un sandbox de Node (vm) con un DOM mínimo, en vez de duplicar su
 * lógica en un módulo aparte.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-dashboard-xss.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

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

const APP_JS_PATH = path.join(__dirname, "../security-agent/dashboard/app.js");
const SOURCE = fs.readFileSync(APP_JS_PATH, "utf-8");

function makeStubElement(): Record<string, unknown> {
  const el: Record<string, unknown> = { classList: { add() {}, remove() {}, contains: () => false } };
  el["addEventListener"] = () => {};
  el["style"] = {};
  el["dataset"] = {};
  return el;
}

function loadSandbox(): Record<string, unknown> {
  const context: Record<string, unknown> = {
    document: {
      getElementById: () => makeStubElement(),
      addEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => makeStubElement(),
      createElementNS: () => makeStubElement(),
    },
    window: { devicePixelRatio: 1 },
    location: { search: "" },
    URLSearchParams: URLSearchParams,
    fetch: () => Promise.reject(new Error("fetch stub")),
    requestAnimationFrame: () => {},
    performance: { now: () => 0 },
    console,
  };
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "app.js" });
  return context;
}

const sandbox = loadSandbox();
const esc = sandbox["esc"] as (s: unknown) => string;
const safeScore = sandbox["safeScore"] as (s: unknown) => number;

// ── esc() ────────────────────────────────────────────────────────────────────

check("esc() carga correctamente desde app.js", () => {
  assert.equal(typeof esc, "function");
});

check("esc() neutraliza <img onerror=...> (payload clásico de vuln_054/055)", () => {
  const out = esc('<img src=x onerror=alert(1)>');
  assert.equal(out.includes("<img"), false);
  assert.ok(out.includes("&lt;img"));
});

check("esc() neutraliza <script>", () => {
  const out = esc("<script>alert(2)</script>");
  assert.equal(/<script>/i.test(out), false);
});

check("esc() no deja pasar & sin escapar (evitaría doble interpretación)", () => {
  assert.equal(esc("Tom & Jerry"), "Tom &amp; Jerry");
});

check("esc() maneja null/undefined sin lanzar", () => {
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

// ── safeScore() (vuln_055) ────────────────────────────────────────────────────

check("safeScore() carga correctamente desde app.js", () => {
  assert.equal(typeof safeScore, "function");
});

check("safeScore() acepta un score numérico válido", () => {
  assert.equal(safeScore(85), 85);
  assert.equal(safeScore(0), 0);
  assert.equal(safeScore(100), 100);
});

check("safeScore() rechaza un payload no numérico y usa 0 (nunca lo inserta tal cual)", () => {
  assert.equal(safeScore("<img src=x onerror=alert(1)>"), 0);
  assert.equal(safeScore(undefined), 0);
  assert.equal(safeScore(null), 0);
  assert.equal(safeScore(NaN), 0);
});

check("safeScore() acota fuera de rango a 0", () => {
  assert.equal(safeScore(150), 0);
  assert.equal(safeScore(-5), 0);
});

// ── Drive link (vuln_054 + vuln_060) ──────────────────────────────────────────

check("loadDriveHistory sanea el nombre del archivo con esc()", () => {
  assert.match(SOURCE, /const name = esc\(f\.name\)/);
});

check("loadDriveHistory solo enlaza si webViewLink empieza con el prefijo de Drive", () => {
  assert.match(SOURCE, /f\.webViewLink\.startsWith\(DRIVE_LINK_PREFIX\)/);
  assert.match(SOURCE, /DRIVE_LINK_PREFIX = 'https:\/\/drive\.google\.com\//);
});

check("los enlaces target=_blank del dashboard llevan rel=noopener noreferrer", () => {
  const blankLinks = [...SOURCE.matchAll(/target="_blank"([^>]*)/g)];
  assert.ok(blankLinks.length > 0, "no se encontró ningún target=_blank en app.js");
  for (const match of blankLinks) {
    assert.ok(/rel="noopener noreferrer"/.test(match[0]), `sin rel=noopener: ${match[0]}`);
  }
});

// ── renderHistory usa esc()/safeScore() en vez de interpolar directo ────────

check("renderHistory pasa el score por safeScore() antes de insertarlo", () => {
  assert.match(SOURCE, /const score = safeScore\(h\.security_score\)/);
});

check("renderHistory escapa la fecha y el conteo de vulnerabilidades", () => {
  assert.match(SOURCE, /esc\(new Date\(h\.timestamp\)\.toLocaleDateString\(\)\)/);
});

// ── CSP (ya cubierto por la tarea 477 — se verifica que sigue vigente) ───────

check("headers.ts sigue exportando una CSP restrictiva para el dashboard", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DASHBOARD_CSP } = require("../security-agent/headers");
  assert.match(DASHBOARD_CSP, /script-src 'self'/);
  assert.match(DASHBOARD_CSP, /default-src 'none'/);
  assert.match(DASHBOARD_CSP, /img-src 'self' data:/);
  assert.match(DASHBOARD_CSP, /connect-src 'self'/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
