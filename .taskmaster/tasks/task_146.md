# Task ID: 146

**Title:** Refactor CheckoutClient to implement two-step manual deposit flow

**Status:** done

**Dependencies:** 144 ✓, 145 ✓

**Priority:** high

**Description:** Modify components/planes/CheckoutClient.tsx to replace Recurrente redirect with manual deposit workflow: show bank account info, then receipt upload form

**Details:**

Refactor components/planes/CheckoutClient.tsx:

1. Remove handlePagarEnLinea function and Recurrente checkout logic
2. Add new state:
   - paso: 'datos' | 'comprobante' | 'confirmacion'
   - pagoId: number | null
   - archivoSeleccionado: File | null
   - mesSeleccionado: string (default getMesActual())
   - subiendoComprobante: boolean
3. Replace entire JSX structure with three-step flow:

Step 1 (paso='datos') — show bank account and amount:
- Display plan name, precio.duracionMeses, precio.precioTotalCentavos formatted
- Show CUENTA_DEPOSITO in styled card with:
  - Banco, Nombre de cuenta, Tipo de cuenta, Número de cuenta
  - Copy button next to numeroCuenta (onClick → navigator.clipboard.writeText)
- Button 'Ya realicé el depósito' → calls checkoutManual, sets pagoId, moves to paso='comprobante'

Step 2 (paso='comprobante') — upload receipt:
- File input (accept='image/*,application/pdf')
- Month selector (current month default, dropdown with ±3 months options)
- Upload button → creates FormData, calls subirComprobante(pagoId, formData), moves to paso='confirmacion'
- Show loading state while subiendoComprobante=true

Step 3 (paso='confirmacion') — success message:
- 'Recibimos tu comprobante, nuestro equipo lo va a confirmar en las próximas horas.'
- Link to /mis-cursos

Error handling: catch errors from both API calls, display in aviso state

Remove WhatsApp option (PRD says to replace, not add alongside)

**Test Strategy:**

Manual E2E test: (1) checkout page shows bank account info with copy button, (2) clicking 'Ya realicé el depósito' creates pending Suscripcion and shows upload form, (3) uploading image/PDF calls API and shows success message, (4) verify file appears in Drive under correct student/month folders, (5) PagoSuscripcion has comprobanteUrl populated, (6) error states display correctly
