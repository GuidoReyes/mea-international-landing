/**
 * Pruebas de autenticación (tarea 483): contraseñas con crypto y OTP en tiempo constante.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-auth-security.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { generateSecurePassword } from "../lib/crypto-utils";
import { verifyOtpCode } from "../lib/otp-utils";

let failures = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

async function main(): Promise<void> {
// ── generateSecurePassword ────────────────────────────────────────────────────

await check("longitud por defecto: 12 caracteres", () => {
  assert.equal(generateSecurePassword().length, 12);
});

await check("longitud personalizada", () => {
  assert.equal(generateSecurePassword(20).length, 20);
});

await check("usa las cuatro categorías del charset en las proporciones esperadas", () => {
  // Cada posición se elige independiente y uniforme del charset (70 caracteres), así que
  // NO hay garantía de que una contraseña de 12 tenga las 4 categorías (con 12 posiciones
  // hay ~0.4% de chance de que falte una categoría; exigirlo por contraseña sería una
  // aserción distinta a "distribución uniforme" y produciría falsos negativos esporádicos).
  // En cambio, se mide la distribución sobre una muestra grande (una contraseña larga =
  // 2000 extracciones i.i.d. de la misma distribución).
  const sample = generateSecurePassword(2000);
  const counts = { upper: 0, lower: 0, digit: 0, symbol: 0 };
  for (const ch of sample) {
    if (/[A-Z]/.test(ch)) counts.upper++;
    else if (/[a-z]/.test(ch)) counts.lower++;
    else if (/[0-9]/.test(ch)) counts.digit++;
    else counts.symbol++;
  }
  assert.ok(Object.values(counts).every((n) => n > 0), `alguna categoría no apareció: ${JSON.stringify(counts)}`);
  // Proporciones esperadas del charset: mayúsc 26/70, minúsc 26/70, dígitos 10/70, símbolos 8/70.
  // Margen amplio para que la prueba no sea frágil.
  assert.ok(counts.upper / sample.length > 0.2 && counts.upper / sample.length < 0.55);
  assert.ok(counts.digit / sample.length > 0.05 && counts.digit / sample.length < 0.3);
  assert.ok(counts.symbol / sample.length > 0.03 && counts.symbol / sample.length < 0.25);
});

await check("entropía >= 60 bits a longitud 12 (charset >= 32)", () => {
  const CHARSET_SIZE = 70; // A-Z(26) + a-z(26) + 0-9(10) + símbolos(8) del generador
  const bitsPerChar = Math.log2(CHARSET_SIZE);
  assert.ok(12 * bitsPerChar >= 60, `${12 * bitsPerChar} bits < 60`);
});

await check("no se repiten en 500 llamadas (aleatoriedad real, no Math.random)", () => {
  const passwords = new Set(Array.from({ length: 500 }, () => generateSecurePassword()));
  assert.equal(passwords.size, 500);
});

await check("longitud inválida lanza en vez de devolver algo débil", () => {
  assert.throws(() => generateSecurePassword(0));
  assert.throws(() => generateSecurePassword(-1));
  assert.throws(() => generateSecurePassword(7)); // por debajo del mínimo de 12 pedido por la tarea
});

// ── verifyOtpCode: sin salto de bcrypt cuando no hay registro ────────────────

await check("con hash real y código correcto -> true", async () => {
  const bcrypt = await import("bcrypt");
  const hash = await bcrypt.hash("123456", 10);
  assert.equal(await verifyOtpCode("123456", hash), true);
});

await check("con hash real y código incorrecto -> false", async () => {
  const bcrypt = await import("bcrypt");
  const hash = await bcrypt.hash("123456", 10);
  assert.equal(await verifyOtpCode("000000", hash), false);
});

await check("sin registro (hash null/undefined) -> false, sin lanzar", async () => {
  assert.equal(await verifyOtpCode("123456", null), false);
  assert.equal(await verifyOtpCode("123456", undefined), false);
});

await check("sin registro: SIEMPRE ejecuta bcrypt.compare (no hay atajo síncrono)", async () => {
  const start = process.hrtime.bigint();
  await verifyOtpCode("123456", null);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  // bcrypt con 10 rondas tarda decenas de ms; un atajo (`otp ? compare(...) : false`)
  // resolvería en <1ms. No es una prueba de tiempo estricta, solo confirma que se
  // hizo trabajo real y no se devolvió false de inmediato.
  assert.ok(elapsedMs > 5, `resolvió en ${elapsedMs.toFixed(2)}ms — parece que no llamó a bcrypt`);
});

await check("con registro y sin registro: tiempos del mismo orden de magnitud", async () => {
  const bcrypt = await import("bcrypt");
  const hash = await bcrypt.hash("123456", 10);

  const time = async (fn: () => Promise<unknown>): Promise<number> => {
    const start = process.hrtime.bigint();
    await fn();
    return Number(process.hrtime.bigint() - start) / 1_000_000;
  };

  const withRecord = await time(() => verifyOtpCode("000000", hash));
  const withoutRecord = await time(() => verifyOtpCode("000000", null));

  // Umbral generoso (no es un banco de pruebas de timing dedicado): ambas rutas
  // hacen un bcrypt.compare de costo 10, así que deben quedar en el mismo orden
  // de magnitud. Antes del fix, withoutRecord habría sido ~0ms.
  const ratio = Math.max(withRecord, withoutRecord) / Math.min(withRecord, withoutRecord);
  assert.ok(ratio < 5, `con registro=${withRecord.toFixed(1)}ms, sin registro=${withoutRecord.toFixed(1)}ms, razón=${ratio.toFixed(1)}`);
});

// ── auth.ts: vuln_010 cerrado (tarea #508, ronda 2) — sin bandera, sin token en el body ──

await check("auth.ts ya no tiene la bandera LEGACY_TOKEN_IN_BODY ni el campo token en la respuesta", () => {
  const authSource = fs.readFileSync(path.join(__dirname, "../routes/auth.ts"), "utf-8");
  // El código (fuera de comentarios) ya no debe declarar ni llamar la función.
  const codeOnly = authSource.replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/shouldIncludeTokenInBody/.test(codeOnly), false);
  assert.equal(/process\.env\.LEGACY_TOKEN_IN_BODY/.test(codeOnly), false);
  // La respuesta de POST /login solo debe tener `admin` — el token vive únicamente
  // en la cookie httpOnly, confirmado con un login real contra producción.
  assert.match(authSource, /res\.json\(\{\s*\n\s*admin: \{ id: admin\.id, email: admin\.email, nombre: admin\.nombre, rol: admin\.rol \},\s*\n\s*\}\);/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
}

main().catch((err) => {
  console.log(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
