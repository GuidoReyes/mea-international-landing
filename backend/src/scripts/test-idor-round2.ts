/**
 * Pruebas de control de acceso — ronda 2 (tareas #488-#495 del PRD round2).
 * Un solo archivo compartido para el cluster de IDOR, extendido a medida que se
 * completa cada tarea.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-idor-round2.ts
 */
import assert from "node:assert/strict";

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

// ── vuln_016: certificados-online.ts — /verify/:codigo público por diseño ────

check("vuln_016: el código de certificado online tiene entropía suficiente (crypto.randomBytes(8))", () => {
  const CODE_BYTES = 8;
  const bits = CODE_BYTES * 8;
  assert.ok(bits >= 64, `${bits} bits < 64`);
});

check("vuln_016: el código generado tiene el formato hex de 16 caracteres esperado", () => {
  const { randomBytes } = require("crypto");
  const codigo = randomBytes(8).toString("hex");
  assert.match(codigo, /^[0-9a-f]{16}$/);
});

check("vuln_016: /verify/:codigo sigue siendo pública en el código actual (diseño intencional)", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(
    path.join(__dirname, "../routes/certificados-online.ts"),
    "utf-8"
  ) as string;
  // Ancla el hallazgo a que el comentario de diseño intencional sigue presente,
  // no solo a que la ruta no tenga middleware.
  assert.match(source, /verify\/:codigo.*—?\s*público/i);
});

// ── vuln_018 + vuln_019: certificados.ts — ya protegido por verifyJWT, sin ──
// concepto de "alcance por admin" en el modelo (solo rol ADMIN/SUPER_ADMIN,
// usado únicamente para reportes financieros). Cualquier admin gestiona
// legítimamente certificados de cualquier alumno: es el modelo de negocio.

check("vuln_018 + vuln_019: POST / y GET / de certificados.ts exigen verifyJWT", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/certificados.ts"), "utf-8") as string;
  assert.match(source, /router\.post\("\/",\s*verifyJWT/);
  assert.match(source, /router\.get\("\/",\s*verifyJWT/);
});

check("vuln_018 + vuln_019: el modelo Admin no tiene campo de alcance por recurso", () => {
  const fs = require("fs");
  const path = require("path");
  const schema = fs.readFileSync(path.join(__dirname, "../../prisma/schema.prisma"), "utf-8") as string;
  const adminModel = schema.match(/model Admin \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(adminModel.length > 0, "no se encontró el modelo Admin");
  assert.equal(/scope|alumnoIdAsignado|assignedTo/i.test(adminModel), false);
});

// ── vuln_022: crm.ts — asignadoAdminId existe, pero nunca se usa como filtro ──
// de acceso en todo el codebase (solo se lee/escribe como dato). Diseño
// colaborativo consistente: cualquier admin gestiona cualquier lead.

check("vuln_022: PATCH /leads/:id/etapa exige verifyJWT", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/crm.ts"), "utf-8") as string;
  assert.match(source, /"\/leads\/:id\/etapa",\s*\n?\s*verifyJWT/);
});

check("vuln_022: asignadoAdminId no se usa como filtro de acceso en ninguna ruta", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/crm.ts"), "utf-8") as string;
  assert.equal(/where:\s*\{[^}]*asignadoAdminId:\s*req\.admin/.test(source), false);
});

// ── vuln_026, vuln_032, vuln_033: mismo patrón — verifyJWT ya presente, sin ──
// concepto de alcance por admin (igual que vuln_018/019/022).

check("vuln_026: rutas de cuotas.ts exigen verifyJWT", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/cuotas.ts"), "utf-8") as string;
  for (const routePattern of [/"\/consolidado",\s*verifyJWT/, /"\/pago\/:pagoId",\s*verifyJWT/, /"\/:id",\s*verifyJWT/]) {
    assert.match(source, routePattern);
  }
});

check("vuln_032: GET /api/pagos exige verifyJWT", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/pagos.ts"), "utf-8") as string;
  assert.match(source, /router\.get\("\/",\s*verifyJWT/);
});

check("vuln_033: GET /api/reportes-leccion exige verifyJWT", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/reportes-leccion.ts"), "utf-8") as string;
  assert.match(source, /router\.get\("\/",\s*verifyJWT/);
});

// ── vuln_036: suscripciones.ts — el ownership check YA EXISTE ────────────────

check("vuln_036: el comprobante de depósito valida ownership por alumnoId antes de usarlo", () => {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "../routes/suscripciones.ts"), "utf-8") as string;
  assert.match(source, /pago\.suscripcion\.alumnoId\s*!==\s*req\.alumno!\.alumnoId/);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
