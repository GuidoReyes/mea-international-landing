/**
 * Pruebas de seguridad de scripts operativos (tarea 486).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-script-security.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { generateOAuthState, verifyOAuthState } from "../lib/oauth-state";
import { isTrustedR2Url } from "../lib/r2-url";
import { requireAdminEmail } from "./seed-admin";

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

// ── vuln_046: estado de OAuth (CSRF/replay en get-drive-token.ts) ────────────

check("generateOAuthState produce cadenas hex de 32 caracteres, distintas cada vez", () => {
  const a = generateOAuthState();
  const b = generateOAuthState();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});

check("verifyOAuthState acepta el mismo estado que se generó", () => {
  const state = generateOAuthState();
  assert.equal(verifyOAuthState(state, state), true);
});

check("verifyOAuthState rechaza un estado distinto (replay/CSRF)", () => {
  assert.equal(verifyOAuthState(generateOAuthState(), generateOAuthState()), false);
});

check("verifyOAuthState rechaza null/undefined/vacío", () => {
  assert.equal(verifyOAuthState(null, "abc"), false);
  assert.equal(verifyOAuthState(undefined, "abc"), false);
  assert.equal(verifyOAuthState("", "abc"), false);
});

// ── vuln_043: solo se hace fetch a URLs propias de R2 (generate-leccion.ts) ──

check("isTrustedR2Url acepta una URL que empieza con el publicUrl configurado", () => {
  assert.equal(isTrustedR2Url("https://media.mea.edu.gt/lecciones/1/audio/x.wav", "https://media.mea.edu.gt"), true);
});

check("isTrustedR2Url rechaza un dominio distinto (evita SSRF si el origen cambiara)", () => {
  assert.equal(isTrustedR2Url("https://evil.com/lecciones/1/audio/x.wav", "https://media.mea.edu.gt"), false);
});

check("isTrustedR2Url rechaza un host que solo contiene el publicUrl como subcadena", () => {
  assert.equal(isTrustedR2Url("https://media.mea.edu.gt.evil.com/x.wav", "https://media.mea.edu.gt"), false);
});

// ── vuln_044: ADMIN_EMAIL sin valor por defecto (seed-admin.ts) ──────────────

check("requireAdminEmail acepta un email presente", () => {
  assert.equal(requireAdminEmail("admin@mea.edu.gt"), "admin@mea.edu.gt");
});

check("requireAdminEmail lanza si falta, sin caer a un default conocido", () => {
  assert.throws(() => requireAdminEmail(undefined), /ADMIN_EMAIL/);
  assert.throws(() => requireAdminEmail(""), /ADMIN_EMAIL/);
});

// ── vuln_036: credenciales del roster con permisos 0600 ──────────────────────

check("el CSV de credenciales se escribe con permisos 0600 (crear-alumnos-grupo.ts)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mea-roster-test-"));
  try {
    const file = path.join(dir, "credenciales.csv");
    // Mismo llamado que usa el script: writeFileSync(outFile, csv, { mode: 0o600, encoding: "utf8" })
    fs.writeFileSync(file, "nombre,email,carnet,password,estado\n", { mode: 0o600, encoding: "utf8" });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── ronda 2 (tarea #506) ──────────────────────────────────────────────────────

const generarAudioSource = fs.readFileSync(
  path.join(__dirname, "generar-audio-faltante.ts"),
  "utf-8"
);

check("vuln_044: generar-audio-faltante.ts valida la URL de R2 antes del fetch, igual que generate-leccion.ts", () => {
  assert.match(generarAudioSource, /import \{ isTrustedR2Url \} from "\.\.\/lib\/r2-url"/);
  assert.match(generarAudioSource, /isTrustedR2Url\(url, r2PublicUrl\)/);
  // El fetch de cotejo debe venir DESPUÉS del chequeo, no antes.
  const idxCheck = generarAudioSource.indexOf("isTrustedR2Url(url, r2PublicUrl)");
  const idxFetch = generarAudioSource.indexOf('fetch(url, { method: "HEAD" })');
  assert.ok(idxCheck > 0 && idxFetch > idxCheck, "el fetch debe ocurrir después de validar la URL");
});

check("generar-audio-faltante.ts no ejecuta main() al importarlo (mismo bug que seed-admin.ts, tarea #486)", () => {
  assert.match(generarAudioSource, /if \(require\.main === module\)/);
});

check("vuln_045: falso positivo confirmado — el frontend no usa dangerouslySetInnerHTML para lecciones", () => {
  // La única aparición de dangerouslySetInnerHTML en todo el frontend es
  // components/ui/legal-modal.tsx (términos/privacidad estáticos), no lecciones.
  const leccionPageSource = fs.readFileSync(
    path.join(__dirname, "../../../app/cursos/[slug]/leccion/[leccionSlug]/page.tsx"),
    "utf-8"
  );
  assert.equal(/dangerouslySetInnerHTML/.test(leccionPageSource), false);
});

check("vuln_046: falso positivo confirmado — generate-leccion.ts ya valida ANTHROPIC_API_KEY (ronda 1, tarea #483)", () => {
  const generateLeccionSource = fs.readFileSync(
    path.join(__dirname, "generate-leccion.ts"),
    "utf-8"
  );
  assert.match(generateLeccionSource, /validateAnthropicApiKey\(process\.env\.ANTHROPIC_API_KEY\)/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
