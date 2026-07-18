# Task ID: 96

**Title:** Crear frontend: página /checkout/[planPrecioId]

**Status:** done

**Dependencies:** 94 ✓, 89 ✓

**Priority:** high

**Description:** Página de checkout que inicia el flujo de pago con Recurrente o fallback a WhatsApp

**Details:**

Crear `app/checkout/[planPrecioId]/page.tsx`:

1. Resolver params de Next.js 16 (es Promise): `const { planPrecioId } = await params`
2. Fetch del plan y precio desde `GET /api/planes` (público)
3. Mostrar resumen del plan:
   - Nombre del plan
   - Duración en meses
   - Precio total formateado (usar helper `formatearPrecioCentavos`)
   - Precio por mes
   - Features incluidas

4. Si hay sesión de alumno (token existe):
   - Botón "Pagar ahora" que llama a `POST /api/suscripciones/checkout` con `{ planPrecioId }`
   - Si respuesta 503 (Recurrente no configurado) O si no hay sesión:
     - Mostrar fallback: CTA a WhatsApp con mensaje preformateado:
       - Texto: "Hola, quiero suscribirme al plan [nombre] por [duración] meses"
       - Link: `https://wa.me/50212345678?text=[mensaje URL encoded]`
   - Si respuesta exitosa:
     - Guardar `suscripcionId` en localStorage
     - Redirigir a `checkoutUrl` de Recurrente

5. Si NO hay sesión:
   - Mostrar mensaje "Iniciá sesión para continuar"
   - Link a `/alumno/login?redirect=/checkout/${planPrecioId}`

6. Crear `app/checkout/success/page.tsx`:
   - Mensaje de éxito "Tu pago está siendo procesado"
   - Link a `/mis-cursos`

7. Crear `app/checkout/cancel/page.tsx`:
   - Mensaje "Pago cancelado"
   - Botón para reintentar

Tecnologías: Next.js 16 App Router, React hooks, localStorage, URL encoding

**Test Strategy:**

E2E tests:
- Usuario sin sesión ve mensaje de login
- Usuario con sesión ve botón de pago
- Checkout exitoso redirige a Recurrente
- Checkout con Recurrente no configurado muestra fallback WhatsApp
- Link de WhatsApp contiene mensaje correcto
- Página de éxito muestra confirmación
- Página de cancelación permite reintentar
