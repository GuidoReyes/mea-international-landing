/**
 * Prueba de safeEqual (comparación constante en tiempo basada en SHA-256).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-safe-equal.ts
 */
import assert from "node:assert/strict";
import { safeEqual } from "../lib/safe-equal";

interface Case {
  readonly name: string;
  readonly a: string;
  readonly b: string;
  readonly expected: boolean;
}

const LONG = "x".repeat(10_000);

const CASES: readonly Case[] = [
  { name: "cadenas iguales", a: "test-secret-123", b: "test-secret-123", expected: true },
  { name: "cadenas distintas de igual longitud", a: "test-secret-123", b: "test-secret-124", expected: false },
  { name: "prefijo de la clave", a: "test-secret", b: "test-secret-123", expected: false },
  { name: "clave con prefijo extra", a: "test-secret-123-extra", b: "test-secret-123", expected: false },
  { name: "espacios finales en a", a: "test-secret-123   ", b: "test-secret-123", expected: false },
  { name: "espacios finales en b", a: "test-secret-123", b: "test-secret-123   ", expected: false },
  { name: "espacios iniciales", a: "  test-secret-123", b: "test-secret-123", expected: false },
  { name: "distinta capitalización", a: "Test-Secret-123", b: "test-secret-123", expected: false },
  { name: "unicode igual", a: "clave-ñandú-✓", b: "clave-ñandú-✓", expected: true },
  { name: "unicode con acento distinto", a: "clave-é", b: "clave-e", expected: false },
  { name: "vacías iguales", a: "", b: "", expected: true },
  { name: "vacía contra no vacía", a: "", b: "abc", expected: false },
  { name: "carácter nulo al final", a: "abc\0", b: "abc", expected: false },
  { name: "cadenas largas iguales", a: LONG, b: LONG, expected: true },
  { name: "cadenas largas con un carácter distinto", a: LONG, b: `${LONG.slice(0, -1)}y`, expected: false },
];

let failures = 0;
for (const c of CASES) {
  const actual = safeEqual(c.a, c.b);
  try {
    assert.equal(actual, c.expected);
    console.log(`PASS  ${c.name}`);
  } catch {
    failures += 1;
    console.log(`FAIL  ${c.name} (esperado=${c.expected}, obtenido=${actual})`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log(`\nTodas las pruebas pasaron (${CASES.length})`);
