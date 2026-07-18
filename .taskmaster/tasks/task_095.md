# Task ID: 95

**Title:** Implementar webhook de Recurrente con validación HMAC

**Status:** done

**Dependencies:** 94 ✓

**Priority:** high

**Description:** Endpoint seguro para recibir notificaciones de pagos de Recurrente y activar suscripciones

**Details:**

Crear en `backend/src/routes/webhooks.ts` (archivo nuevo):

`POST /api/webhooks/recurrente` (público, sin auth JWT):
1. Crear middleware `verifyRecurrenteHmac` inspirado en `verifyMetaHmac`:
   - Leer header `X-Recurrente-Signature`
   - Usar `req.rawBody` (ya capturado en index.ts)
   - Calcular HMAC SHA-256 con `RECURRENTE_WEBHOOK_SECRET`
   - Comparar con `timingSafeEqual` (timing-safe)
   - Si no coincide, responder 403

2. Parsear body (evento de Recurrente):
```json
{
  "event": "payment.succeeded",
  "data": {
    "checkout_id": "ch_xxx",
    "metadata": {
      "suscripcionId": number,
      "alumnoId": number,
      "planPrecioId": number
    },
    "amount": number,
    "currency": "GTQ"
  }
}
```

3. Si `event === "payment.succeeded"`:
   - Buscar `Suscripcion` por `idExterno = checkout_id` O por `id = metadata.suscripcionId`
   - **Idempotencia**: Si ya está ACTIVA, responder 200 sin cambios
   - Buscar `PlanPrecio` para obtener `duracionMeses`
   - Calcular fechas:
     - `fechaInicio = new Date()`
     - `fechaFin = addMonths(fechaInicio, duracionMeses)` (usar date-fns)
   - Actualizar `Suscripcion`: `estado=ACTIVA`, `fechaInicio`, `fechaFin`
   - Crear `PagoSuscripcion`:
     - `suscripcionId`, `montoCentavos`, `moneda`, `estado=COMPLETADO`
     - `proveedor="recurrente"`, `idExterno=checkout_id`, `pagadoEn=now`
   - Si alumno tiene `whatsapp`, enviar confirmación usando `sendWhatsAppMessage`:
     - Mensaje: "¡Tu suscripción a [plan] está activa! Válida hasta [fechaFin]. Accedé a tus cursos en [URL]"
   - Log info con detalles del pago

4. Responder siempre 200 (aunque falle WhatsApp, no reintentar por eso)

Registrar router en `backend/src/index.ts` con el middleware HMAC.

Tecnologías: crypto, Express middleware, Prisma transactions, date-fns, WhatsApp API

**Test Strategy:**

Integration tests:
- Webhook sin firma válida rechazado con 403
- Webhook con firma válida y evento payment.succeeded activa suscripción
- fechaFin calculada correctamente (fechaInicio + duracionMeses)
- PagoSuscripcion creado con datos correctos
- Idempotencia: reintentos no duplican activación
- WhatsApp se envía si alumno tiene número
- Webhook con evento desconocido responde 200 sin acción
