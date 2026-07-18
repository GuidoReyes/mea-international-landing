# Task ID: 141

**Title:** Implement POST /api/suscripciones/checkout-manual endpoint

**Status:** done

**Dependencies:** 139 ✓, 140 ✓

**Priority:** high

**Description:** Create new endpoint to initiate manual deposit payment flow, creating pending Suscripcion and PagoSuscripcion records

**Details:**

In backend/src/routes/suscripciones.ts, add new route POST /api/suscripciones/checkout-manual:

1. Middleware: verifyAlumnoJWT, rateLimitCheckout (reuse existing)
2. Body validation: { planPrecioId: number }
3. Fetch planPrecio with plan relation, verify exists (404 if not)
4. Fetch alumno from req.alumno.alumnoId, verify activo (401 if not)
5. Check for existing PENDIENTE Suscripcion with same alumnoId + planPrecioId + proveedor='manual_deposito':
   - If exists and has PENDIENTE PagoSuscripcion, reuse both (don't create duplicates)
   - If not, create new Suscripcion with estado=PENDIENTE, proveedor='manual_deposito'
6. Create (or reuse) PagoSuscripcion with:
   - proveedor: 'deposito_bi'
   - estado: PENDIENTE
   - montoCentavos: planPrecio.precioTotalCentavos
   - moneda: planPrecio.moneda
7. Response JSON:
{
  suscripcionId: number,
  pagoId: number,
  cuenta: {
    nombreCuenta: 'Corporacion ME',
    tipoCuenta: 'Cuenta monetaria BI',
    numeroCuenta: 'GTQ-6930015505',
    banco: 'Banco Industrial'
  }
}

Error handling: catch all errors, return appropriate status codes with error messages

**Test Strategy:**

Integration tests: (1) successful checkout-manual creates Suscripcion and PagoSuscripcion with correct fields, (2) calling twice with same planPrecioId reuses existing pending records, (3) invalid planPrecioId returns 404, (4) inactive alumno returns 401, (5) rate limit triggers after CHECKOUT_MAX_POR_MINUTO attempts
