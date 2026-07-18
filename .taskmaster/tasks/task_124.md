# Task ID: 124

**Title:** Create test script for live class time logic

**Status:** done

**Dependencies:** 123 ✓

**Priority:** high

**Description:** Implement backend/src/scripts/test-clases-en-vivo.ts following the assert-based pattern from test-fase3.ts

**Details:**

Create `backend/src/scripts/test-clases-en-vivo.ts` following the pattern from `test-fase3.ts` (using `assert`, no Jest/Vitest).

Test cases:

```typescript
import assert from "assert";
import { obtenerAhoraGuatemala, estaEnVivo, obtenerClasesEnVivo, obtenerProximaClase } from "../lib/horario-clases";

// Test 1: obtenerAhoraGuatemala with UTC date
const utcDate = new Date("2026-07-09T19:00:00Z"); // 19:00 UTC = 13:00 Guatemala (UTC-6)
const gt = obtenerAhoraGuatemala(utcDate);
assert.strictEqual(gt.diaSemana, 3); // Wednesday
assert.strictEqual(gt.minutos, 13 * 60); // 13:00 = 780 minutes

// Test 2: estaEnVivo - class currently live
const horaInicio17 = { diaSemana: 1, horaInicio: "17:00" };
const ahora17_30 = { diaSemana: 1, minutos: 17 * 60 + 30 };
assert.strictEqual(estaEnVivo(horaInicio17, 60, ahora17_30), true);

// Test 3: estaEnVivo - exact end boundary (should be false)
const ahora18_00 = { diaSemana: 1, minutos: 18 * 60 };
assert.strictEqual(estaEnVivo(horaInicio17, 60, ahora18_00), false);

// Test 4: estaEnVivo - one minute before end (should be true)
const ahora17_59 = { diaSemana: 1, minutos: 17 * 60 + 59 };
assert.strictEqual(estaEnVivo(horaInicio17, 60, ahora17_59), true);

// Test 5: obtenerClasesEnVivo - no active groups
const gruposVacio: any[] = [];
assert.deepStrictEqual(obtenerClasesEnVivo(gruposVacio, ahora17_30), []);

// Test 6: obtenerProximaClase - wraps to next week
const grupoLunes: any = {
  id: 1,
  nombre: "Test",
  niveles: "A1",
  activo: true,
  duracionMinutos: 60,
  horarios: [{ diaSemana: 1, horaInicio: "17:00" }]
};
const jueves21 = { diaSemana: 4, minutos: 21 * 60 }; // Thursday 21:00
const proxima = obtenerProximaClase([grupoLunes], jueves21);
assert.strictEqual(proxima?.diaSemana, 1); // Should wrap to Monday
assert.ok(proxima && proxima.minutosHasta > 0); // Should have positive distance

// Test 7: obtenerProximaClase - null when no groups
assert.strictEqual(obtenerProximaClase([], ahora17_30), null);

console.log("✓ obtenerAhoraGuatemala: timezone conversion OK");
console.log("✓ estaEnVivo: boundary cases OK");
console.log("✓ obtenerClasesEnVivo: empty array OK");
console.log("✓ obtenerProximaClase: week wrap OK");
console.log("Todos los tests de clases en vivo pasaron.");
```

Add to package.json scripts:
```json
"test:clases-en-vivo": "ts-node src/scripts/test-clases-en-vivo.ts"
```

**Test Strategy:**

Run `npm run test:clases-en-vivo`. All assertions should pass. Verify that timezone calculations work correctly regardless of server timezone (UTC on Railway), boundary conditions are handled properly, and week wrapping logic is correct.
