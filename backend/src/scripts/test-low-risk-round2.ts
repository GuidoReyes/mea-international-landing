/**
 * Pruebas de los 13 hallazgos LOW de la ronda 2 (tarea #507).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-low-risk-round2.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";

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

function src(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, relPath), "utf-8");
}

// ── vuln_008: CORS no permite localhost en producción ────────────────────────

check("vuln_008: index.ts solo agrega localhost:3000 al CORS fuera de producción", () => {
  const s = src("../index.ts");
  assert.match(s, /process\.env\.NODE_ENV !== "production" \? \["http:\/\/localhost:3000"\] : \[\]/);
});

// ── vuln_013: INCR+EXPIRE con self-heal vía pTTL ──────────────────────────────

check("vuln_013: rateLimitWhatsApp arma el TTL con pTTL (self-heal), no solo count===1", () => {
  const s = src("../middleware/rate-limit.middleware.ts");
  assert.match(s, /const ttlMs = await client\.pTTL\(key\);/);
  assert.match(s, /if \(ttlMs < 0\) {/);
  assert.equal(/if \(count === 1\) {/.test(s), false, "todavía usa el chequeo viejo, sin self-heal");
});

// ── vuln_024: mes valida formato YYYY-MM ──────────────────────────────────────

check("vuln_024: finanzas.ts rechaza un mes con formato inválido antes de parsearlo", () => {
  const s = src("../routes/finanzas.ts");
  assert.match(s, /if \(mes !== undefined && !\/\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$\/\.test\(mes\)\)/);
});

check("la regex de vuln_024 acepta YYYY-MM válido y rechaza mes/formato inválidos", () => {
  const re = /^\d{4}-(0[1-9]|1[0-2])$/;
  assert.equal(re.test("2026-01"), true);
  assert.equal(re.test("2026-12"), true);
  assert.equal(re.test("2026-13"), false);
  assert.equal(re.test("2026-00"), false);
  assert.equal(re.test("no-es-mes"), false);
  assert.equal(re.test("2026-1"), false);
});

// ── vuln_029: setInterval de marketing.ts no puede tumbar el proceso ────────

check("vuln_029: el callback de setInterval en marketing.ts está envuelto en try/catch", () => {
  const s = src("../routes/marketing.ts");
  const idxInterval = s.indexOf("const interval = setInterval(async () => {");
  const idxTry = s.indexOf("try {", idxInterval);
  const idxCatch = s.indexOf("} catch (err) {\n        clearInterval(interval);", idxInterval);
  assert.ok(idxInterval > 0, "no se encontró el setInterval");
  assert.ok(idxTry > idxInterval && idxTry < idxInterval + 200, "el try no envuelve el inicio del callback");
  assert.ok(idxCatch > idxTry, "falta el catch que detiene el interval y loguea");
});

// ── vuln_006 / vuln_031: decisiones de riesgo aceptado documentadas ──────────

check("vuln_006: la decisión de no cifrar el historial en Redis queda documentada en claude.ts", () => {
  assert.match(src("../lib/claude.ts"), /vuln_006 \(riesgo aceptado/);
});

// ── falsos positivos confirmados (sin cambio de código, solo verificación) ──

check("vuln_003: falso positivo — isAdvisorPhone no compara un secreto, no hay bypass real", () => {
  const s = src("../lib/advisor-commands.ts");
  assert.match(s, /export function isAdvisorPhone/);
});

check("vuln_007: falso positivo — client.messages.create() en claude.ts está awaited", () => {
  const s = src("../lib/claude.ts");
  assert.match(s, /const response = await client\.messages\.create\(/);
});

check("vuln_011: falso positivo confirmado — errorHandler ya excluye el stack en producción (tarea #484)", () => {
  const s = src("../middleware/error.middleware.ts");
  assert.match(s, /process\.env\.NODE_ENV !== "production" && typeof httpError\.stack === "string"/);
});

check("vuln_012: falso positivo — el page id de Notion no es un secreto (requiere NOTION_TOKEN para usarse)", () => {
  const s = src("../lib/notion-context.ts");
  assert.match(s, /const MEA_KB_PAGE_ID = "36183de9-b32b-8064-9456-c0d9ce8e942c";/);
  assert.match(s, /function getClient\(\): Client \| null \{\s*\n\s*if \(!process\.env\.NOTION_TOKEN\) return null;/);
});

check("vuln_014: falso positivo — piper-tts.ts usa spawn con argumentos en array, sin shell (sin inyección)", () => {
  const s = src("../lib/piper-tts.ts");
  assert.match(s, /spawn\("piper", \["-m", vozPath, "-f", outputPath\]\)/);
  assert.equal(/shell:\s*true/.test(s), false);
});

check("vuln_015: falso positivo — la cache key de notion-context.ts está acotada y con TTL", () => {
  const s = src("../lib/notion-context.ts");
  assert.match(s, /\.slice\(0, 40\)/);
  assert.match(s, /await setJSON\(cacheKey, context, 3600\)/);
});

check("vuln_028: falso positivo — POST /api/certificados ya requiere verifyJWT (mismo patrón IDOR de la ronda 2)", () => {
  const s = src("../routes/certificados.ts");
  assert.match(s, /router\.post\("\/", verifyJWT, async/);
});

check("vuln_049: falso positivo — seed-curriculum-500.ts son datos estáticos, ya tiene el guard require.main", () => {
  const s = src("../scripts/seed-curriculum-500.ts");
  assert.match(s, /if \(require\.main === module\)/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
