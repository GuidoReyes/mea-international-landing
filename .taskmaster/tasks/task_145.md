# Task ID: 145

**Title:** Extend alumnoApi with manual checkout and receipt upload methods

**Status:** done

**Dependencies:** 144 ✓

**Priority:** medium

**Description:** Add checkoutManual and subirComprobante functions to lib/alumno-api.ts following existing patterns

**Details:**

In lib/alumno-api.ts, extend alumnoApi object with two new methods:

1. checkoutManual: (planPrecioId: number) =>
   alumnoFetch<{ suscripcionId: number; pagoId: number; cuenta: typeof CUENTA_DEPOSITO }>(
     '/api/suscripciones/checkout-manual',
     { method: 'POST', body: JSON.stringify({ planPrecioId }) }
   )

2. subirComprobante: (pagoId: number, formData: FormData) => {
   const token = getAlumnoToken();
   const res = await fetch(`${API_URL}/api/suscripciones/pagos/${pagoId}/comprobante`, {
     method: 'POST',
     headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
     body: formData, // NO Content-Type header — let browser set multipart boundary
   });
   // Handle response same as alumnoFetch (401 → clearAlumnoToken, !ok → throw error)
   if (res.status === 401) {
     clearAlumnoToken();
     throw new Error('Sesión expirada. Iniciá sesión de nuevo.');
   }
   if (!res.ok) {
     const data = await res.json().catch(() => ({}));
     throw new Error(data.error ?? `HTTP ${res.status}`);
   }
   return res.json();
 }

Important: subirComprobante must NOT set Content-Type header — browser auto-sets with multipart boundary when body is FormData.

Validation: TypeScript compiles, methods follow same patterns as existing alumnoApi functions

**Test Strategy:**

Integration tests: (1) checkoutManual calls correct endpoint with planPrecioId, (2) subirComprobante sends FormData with Authorization header but no Content-Type, (3) both handle 401 by clearing token, (4) errors throw with message from response.error field
