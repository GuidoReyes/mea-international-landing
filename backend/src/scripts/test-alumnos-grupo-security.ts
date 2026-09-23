/**
 * Pruebas de seguridad de crear-alumnos-grupo.ts (tarea #499, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-alumnos-grupo-security.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { generarPassword, parseRoster, resolveRosterPath } from "./crear-alumnos-grupo";

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

// ── vuln_041: contraseña legible con dígitos criptográficamente aleatorios ───

check("generarPassword mantiene el formato iam<nombre><3 dígitos>", () => {
  const p = generarPassword("Carlos", "carlos@x.com");
  assert.match(p, /^iamcarlos\d{3}$/);
});

check("generarPassword no repite siempre los mismos dígitos (no es un PRNG fijo)", () => {
  const muestras = new Set(Array.from({ length: 30 }, () => generarPassword("Ana", "ana@x.com")));
  // Con 900 combinaciones posibles y 30 muestras, ver más de una es prácticamente seguro.
  assert.ok(muestras.size > 1, `todas las muestras fueron iguales: ${[...muestras]}`);
});

check("generarPassword cae al email si no hay nombre usable", () => {
  const p = generarPassword("   ", "roberto@x.com");
  assert.match(p, /^iamroberto\d{3}$/);
});

// ── vuln_043: ROSTER_FILE no puede resolver fuera del directorio del proyecto ─

check("resolveRosterPath acepta un archivo dentro del directorio base", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mea-roster-"));
  try {
    const file = path.join(dir, "roster.json");
    fs.writeFileSync(file, "[]");
    const resolved = resolveRosterPath("roster.json", dir);
    assert.equal(fs.realpathSync(resolved), fs.realpathSync(file));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("resolveRosterPath rechaza un path traversal fuera del directorio base", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mea-roster-"));
  try {
    assert.throws(() => resolveRosterPath("../../../etc/passwd", dir), /ROSTER_FILE/);
    assert.throws(() => resolveRosterPath("/etc/passwd", dir), /ROSTER_FILE/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── parseRoster: comportamiento existente sin regresión ──────────────────────

check("parseRoster sigue validando filas del roster (sin regresión)", () => {
  const roster = parseRoster(JSON.stringify([{ nombre: "Ana", apellido: "Ruiz", email: "ana@x.com" }]));
  assert.equal(roster.length, 1);
  assert.equal(roster[0]?.email, "ana@x.com");
  assert.throws(() => parseRoster(JSON.stringify([{ nombre: "Ana" }])), /obligatorios/);
});

// ── vuln_042: el carnet real se genera dentro de createWithUniqueRetry ───────

const SOURCE = fs.readFileSync(path.join(__dirname, "crear-alumnos-grupo.ts"), "utf-8");

check("la creación real usa createWithUniqueRetry con el campo 'carnet' (vuln_042)", () => {
  assert.match(SOURCE, /createWithUniqueRetry\(/);
  assert.match(SOURCE, /"carnet"/);
});

check("la contraseña legible ya no usa Math.random (vuln_041)", () => {
  // El comentario que documenta el fix menciona "Math.random()" a propósito;
  // lo que importa es que el código real ya no lo *llama*.
  assert.equal(/Math\.random\(\)/.test(SOURCE.replace(/^\s*\/\/.*$/gm, "")), false);
  assert.match(SOURCE, /randomInt\(100, 1000\)/);
});

check("main() solo corre si el archivo se ejecuta directamente, no al importarlo", () => {
  assert.match(SOURCE, /if \(require\.main === module\)/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
