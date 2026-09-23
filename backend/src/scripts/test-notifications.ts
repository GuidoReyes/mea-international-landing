/**
 * Pruebas de validación de MS Graph en services/notifications.ts (tarea #498, ronda 2).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-notifications.ts
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { isValidClientId, isValidTenantId } from "../lib/ms-graph-validation";

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

// ── vuln_051: validación de MS_TENANT_ID / MS_CLIENT_ID ──────────────────────

check("isValidTenantId acepta un GUID de tenant real", () => {
  assert.equal(isValidTenantId("72f988bf-86f1-41af-91ab-2d7cd011db47"), true);
});

check("isValidTenantId acepta los literales especiales de Microsoft (multi-tenant)", () => {
  for (const v of ["common", "organizations", "consumers", "COMMON"]) {
    assert.equal(isValidTenantId(v), true, v);
  }
});

check("isValidTenantId rechaza un valor que permitiría alterar la URL del token (inyección)", () => {
  assert.equal(isValidTenantId("evil.com/../../token"), false);
  assert.equal(isValidTenantId(""), false);
  assert.equal(isValidTenantId("common/../evil"), false);
});

check("isValidClientId acepta un GUID válido y rechaza texto libre o los literales de tenant", () => {
  assert.equal(isValidClientId("11111111-2222-3333-4444-555555555555"), true);
  assert.equal(isValidClientId("common"), false);
  assert.equal(isValidClientId("not-a-guid"), false);
});

// ── vuln_051: código real de notifications.ts usa la validación antes del fetch ──

const SOURCE = fs.readFileSync(path.join(__dirname, "../services/notifications.ts"), "utf-8");

check("getMsGraphToken valida tenantId y clientId antes de armar la URL", () => {
  assert.match(SOURCE, /isValidTenantId\(tenantId\)/);
  assert.match(SOURCE, /isValidClientId\(clientId\)/);
});

// ── vuln_052: el error de MS Graph se sanea antes de loguearse ───────────────

check("sendTransactionalEmail sanea el cuerpo de la respuesta de error antes de loguear", () => {
  assert.match(SOURCE, /sanitizeErrorText\(text\)|stripControlChars\(text\)/);
  // No debe seguir interpolando `text` crudo directo en el template del log
  assert.equal(/Error enviando email:.*—\s*\$\{text\}/.test(SOURCE), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
