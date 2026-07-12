import assert from "assert";
import crypto from "crypto";
import { agregarMeses, verificarFirmaWebhook } from "../lib/recurrente";

// ─── agregarMeses ────────────────────────────────────────────────────────────

// Caso normal: 15 mar + 3 meses = 15 jun
assert.strictEqual(
  agregarMeses(new Date("2026-03-15T12:00:00Z"), 3).toISOString().slice(0, 10),
  "2026-06-15"
);

// Fin de mes: 31 ene + 1 mes = 28 feb (2026 no es bisiesto)
assert.strictEqual(
  agregarMeses(new Date("2026-01-31T12:00:00Z"), 1).toISOString().slice(0, 10),
  "2026-02-28"
);

// Año cruzado: 15 nov + 3 meses = 15 feb del año siguiente
assert.strictEqual(
  agregarMeses(new Date("2026-11-15T12:00:00Z"), 3).toISOString().slice(0, 10),
  "2027-02-15"
);

// 12 meses: mismo día, año siguiente
assert.strictEqual(
  agregarMeses(new Date("2026-07-08T12:00:00Z"), 12).toISOString().slice(0, 10),
  "2027-07-08"
);

console.log("✓ agregarMeses: 4 casos OK");

// ─── verificarFirmaWebhook ───────────────────────────────────────────────────

const secretRaw = crypto.randomBytes(24);
const secret = `whsec_${secretRaw.toString("base64")}`;
const rawBody = JSON.stringify({ event_type: "checkout.completed", metadata: { suscripcion_id: "1" } });
const msgId = "msg_test_123";
const ahora = Math.floor(Date.now() / 1000);
const timestamp = String(ahora);

const firmaValida = crypto
  .createHmac("sha256", secretRaw)
  .update(`${msgId}.${timestamp}.${rawBody}`)
  .digest("base64");

// Firma correcta → true
assert.strictEqual(
  verificarFirmaWebhook(rawBody, { id: msgId, timestamp, signature: `v1,${firmaValida}` }, secret, ahora),
  true
);

// Firma incorrecta → false
assert.strictEqual(
  verificarFirmaWebhook(rawBody, { id: msgId, timestamp, signature: "v1,AAAA0000" }, secret, ahora),
  false
);

// Body alterado → false
assert.strictEqual(
  verificarFirmaWebhook(rawBody + "x", { id: msgId, timestamp, signature: `v1,${firmaValida}` }, secret, ahora),
  false
);

// Timestamp fuera de tolerancia (10 min) → false (anti-replay)
assert.strictEqual(
  verificarFirmaWebhook(rawBody, { id: msgId, timestamp, signature: `v1,${firmaValida}` }, secret, ahora + 600),
  false
);

// Headers faltantes → false
assert.strictEqual(verificarFirmaWebhook(rawBody, {}, secret, ahora), false);

// Múltiples firmas, una válida → true
assert.strictEqual(
  verificarFirmaWebhook(
    rawBody,
    { id: msgId, timestamp, signature: `v1,${Buffer.alloc(32).toString("base64")} v1,${firmaValida}` },
    secret,
    ahora
  ),
  true
);

console.log("✓ verificarFirmaWebhook: 6 casos OK");
console.log("Todos los tests de Fase 3 pasaron.");
