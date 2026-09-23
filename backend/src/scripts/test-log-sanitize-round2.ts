/**
 * Pruebas de enmascarado de teléfono, segunda pasada (tarea #503, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-log-sanitize-round2.ts
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

function source(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, relPath), "utf-8");
}

// ── vuln_001: claude.ts / advisor-notify.ts usan el maskPhone compartido ─────

check("claude.ts importa maskPhone de log-sanitize.ts en vez de reimplementarlo", () => {
  const src = source("../lib/claude.ts");
  assert.match(src, /import \{ maskPhone \} from "\.\/log-sanitize"/);
  assert.match(src, /const mask\s*=\s*maskPhone\(telefono\)/);
  assert.equal(/`XXX-\$\{telefono\.slice/.test(src), false, "todavía reimplementa el enmascarado a mano");
});

check("advisor-notify.ts usa maskPhone en vez de telefono.slice(-4) crudo", () => {
  const src = source("../lib/advisor-notify.ts");
  assert.match(src, /import \{ maskPhone \} from "\.\/log-sanitize"/);
  assert.match(src, /log\("info", `\[AdvisorNotify\].*maskPhone\(telefono\)/);
});

// ── vuln_037: whatsapp.webhook.ts sin duplicar maskPhone localmente ──────────

check("whatsapp.webhook.ts importa maskPhone en vez de definirlo localmente", () => {
  const src = source("../routes/whatsapp.webhook.ts");
  assert.match(src, /import \{ maskPhone \} from "\.\.\/lib\/log-sanitize"/);
  assert.equal(/function maskPhone\(/.test(src), false, "todavía tiene una definición local duplicada");
});

// ── vuln_017: auth-alumno.ts enmascara el teléfono en el log de fallo de OTP ─

check("auth-alumno.ts enmascara el número en el log de fallo de envío de OTP", () => {
  const src = source("../routes/auth-alumno.ts");
  assert.match(src, /import \{ maskPhone \} from "\.\.\/lib\/log-sanitize"/);
  assert.match(src, /No se pudo enviar OTP a \$\{maskPhone\(numero\)\}/);
});

// ── vuln_050: falso positivo confirmado (sin datos sensibles en el seed) ─────

check("seed-cursos-online.ts no loguea ningún campo sensible (falso positivo, confirmado por lectura)", () => {
  const src = source("../scripts/seed-cursos-online.ts");
  // Los únicos console.log/console.error del script (verificados por lectura):
  // slug/titulo/id de datos estáticos hardcodeados (CURSOS/PLANES) y el error
  // crudo de main().catch() — nada de eso es un teléfono, password ni token.
  // No debe haber ninguna variable llamada telefono/whatsapp/password/token/
  // codigo/secret en todo el archivo (ni siquiera fuera de un log): confirma
  // que no hay ningún dato de ese tipo que loguear en primer lugar.
  assert.equal(/\b(telefono|whatsapp|password|token|codigo|secret)\s*[:=]/i.test(src), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
process.exit(0);
