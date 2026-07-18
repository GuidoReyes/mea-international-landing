# Task ID: 94

**Title:** Implementar checkout automático con API de Recurrente

**Status:** done

**Dependencies:** 84 ✓

**Priority:** high

**Description:** Crear endpoint de checkout que genera URL de pago en Recurrente y crea suscripción PENDIENTE

**Details:**

Crear en `backend/src/routes/suscripciones.ts`:

`POST /api/suscripciones/checkout` (auth alumno, rate limited):
1. Validar env vars `RECURRENTE_API_KEY`, `RECURRENTE_WEBHOOK_SECRET`
   - Si faltan, responder 503: `{ error: "Recurrente no configurado, usa el flujo manual por WhatsApp" }`
2. Body: `{ planPrecioId }` (validar con Zod)
3. Buscar `PlanPrecio` con include de `plan`
4. Crear `Suscripcion` en DB con:
   - `alumnoId`, `planPrecioId`
   - `estado: PENDIENTE`
   - `proveedor: "recurrente"`
   - `fechaInicio`, `fechaFin`: null (se llenan en webhook)
5. Llamar a API de Recurrente para crear checkout:
   - Endpoint: `POST https://api.recurrente.com/v1/checkouts`
   - Headers: `Authorization: Bearer ${RECURRENTE_API_KEY}`, `Content-Type: application/json`
   - Body:
```json
{
  "amount": planPrecio.precioTotalCentavos,
  "currency": "GTQ",
  "description": `${plan.nombre} - ${planPrecio.duracionMeses} meses`,
  "customer": {
    "email": alumno.email,
    "name": `${alumno.nombre} ${alumno.apellido}`
  },
  "metadata": {
    "suscripcionId": suscripcion.id,
    "alumnoId": alumno.id,
    "planPrecioId": planPrecio.id
  },
  "success_url": `${FRONTEND_URL}/checkout/success?suscripcion=${suscripcion.id}`,
  "cancel_url": `${FRONTEND_URL}/checkout/cancel`
}
```
6. Actualizar `Suscripcion.idExterno` con checkout ID de Recurrente
7. Responder: `{ checkoutUrl: response.checkout_url, suscripcionId }`

Tecnologías: fetch API, Express, Prisma, Zod, rate limiting

**Test Strategy:**

Integration tests:
- Checkout sin env vars retorna 503 con mensaje claro
- Checkout exitoso crea Suscripcion PENDIENTE
- API de Recurrente recibe datos correctos
- idExterno se guarda en DB
- checkoutUrl se devuelve al frontend
- Rate limiting previene abuso
