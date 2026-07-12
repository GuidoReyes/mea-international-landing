# PRD — Pago manual por depósito bancario (Banco Industrial) para Planes online

## 0. Contexto y decisiones ya tomadas con el usuario

Hoy el checkout de `/planes` (`app/checkout/[planPrecioId]/page.tsx` → `CheckoutClient.tsx` →
`alumnoApi.checkout()` → `POST /api/suscripciones/checkout` → `crearCheckoutRecurrente`) redirige
al alumno a la pasarela de pago Recurrente. **Todavía no se va a usar Recurrente.** En su lugar,
cuando el alumno elija un plan, se le debe mostrar la cuenta bancaria de MEA para hacer un depósito
manual, y luego debe poder subir la boleta de pago desde el sitio.

Dato interesante encontrado en el schema ya existente: `Suscripcion.proveedor` tiene un comentario
`// "manual_whatsapp" | "recurrente"` — el flujo manual ya estaba anticipado en el diseño original,
solo que nunca se implementó. Este PRD lo implementa, con el valor `"manual_deposito"` (no
`"manual_whatsapp"`, porque el canal elegido es el sitio web, no WhatsApp — ver decisión abajo).

### Decisiones confirmadas con el usuario (vía preguntas directas)

1. **Canal de envío de la boleta: formulario en el sitio web.** El alumno, con sesión iniciada,
   sube el archivo directo al backend. No se toca el bot de WhatsApp (que vive en otro proyecto,
   `hermes-agent`, fuera de este repo).
2. **Almacenamiento: Google Drive**, reutilizando la integración OAuth2 que ya existe en este repo
   para backups (`backend/src/backup/drive-auth.ts`, funciones `buildDriveClient()` e
   `isDriveConfigured()` — **reutilizar tal cual, no duplicar**). Carpeta raíz "Pagos con depósito"
   con subcarpetas por alumno y luego por mes.
3. **"Redirigir al CRM" = nuevo panel admin, no el pipeline de Leads.** Se usa el modelo
   `PagoSuscripcion` que ya existe (el mismo que usa Recurrente), en estado `PENDIENTE` hasta que
   el equipo lo confirme manualmente desde un nuevo panel en `/admin`. No se toca `crm.ts` ni el
   modelo `Lead` — ese pipeline es para prospectos, no para alumnos ya inscritos pagando su
   mensualidad.
4. **Datos de la cuenta a mostrar** (verbatim, tal como los dio el usuario — no alterar):
   - Nombre de la cuenta: **Corporacion ME**
   - Tipo de cuenta: **Cuenta monetaria BI** (Banco Industrial)
   - Número de cuenta: **GTQ-6930015505**

## 1. Alcance

Reemplaza, por ahora, el paso de pago con Recurrente en `/checkout/[planPrecioId]` por un flujo de
depósito manual + carga de comprobante + confirmación manual desde el admin. **No se borra el código
de Recurrente** (`lib/recurrente.ts`, `routes/webhooks-recurrente.ts`, la rama `proveedor:
"recurrente"`) — queda intacto para cuando se decida reactivarlo; simplemente el frontend deja de
llamarlo por ahora.

## 2. Cambios de datos (Prisma)

En `PagoSuscripcion` (`backend/prisma/schema.prisma`), agregar:
- `comprobanteUrl String?` — link de Drive (`webViewLink`) al archivo de la boleta.
- `comprobanteDriveId String?` — id del archivo en Drive (para poder borrarlo/moverlo después).
- `mesPagado String?` — mes que cubre este pago, formato `"YYYY-MM"`.

No se necesita tocar `Suscripcion` ni ningún enum — `proveedor` ya es `String` libre, y
`PagoEstado`/`SuscripcionEstado` ya tienen los valores necesarios (`PENDIENTE`, `COMPLETADO`,
`RECHAZADO`, `ACTIVA`).

## 3. Backend

### 3.1 Helper de Google Drive — `backend/src/lib/drive-comprobantes.ts`
Reutiliza `buildDriveClient()` / `isDriveConfigured()` de `../backup/drive-auth` (no reimplementar
autenticación). Nueva función `subirComprobanteDeposito({ alumnoNombre, alumnoCarnet, mes, buffer,
nombreArchivo, mimeType })`:
- Busca (o crea si no existe) la carpeta raíz configurada por `GOOGLE_DRIVE_PAGOS_FOLDER_ID` (mismo
  patrón que `GOOGLE_DRIVE_BACKUP_FOLDER_ID` en `backend/src/backup/uploader.ts` — variable de
  entorno con el id de una carpeta ya creada y compartida con las credenciales de Drive existentes).
- Busca o crea subcarpeta `"{apellido}, {nombre} ({carnet})"` dentro de la raíz.
- Busca o crea subcarpeta `"{mes}"` (ej. `"2026-07"`) dentro de la carpeta del alumno.
- Sube el archivo ahí (`drive.files.create`, mismo patrón que `uploader.ts`), devuelve
  `{ driveFileId, url }`.

### 3.2 Endpoint: iniciar pago manual — `POST /api/suscripciones/checkout-manual`
En `backend/src/routes/suscripciones.ts`, junto al `/checkout` existente (no lo reemplaza en el
código, es una ruta nueva). `verifyAlumnoJWT` + reutilizar `rateLimitCheckout` ya existente.
- Body: `{ planPrecioId: number }`.
- Crea (o reutiliza si ya existe una pendiente) `Suscripcion` con `proveedor: "manual_deposito"`,
  `estado: "PENDIENTE"`.
- Crea `PagoSuscripcion` con `proveedor: "deposito_bi"`, `estado: "PENDIENTE"`,
  `montoCentavos: planPrecio.precioTotalCentavos`.
- Responde con `{ suscripcionId, pagoId, cuenta: { nombreCuenta: "Corporacion ME", tipoCuenta:
  "Cuenta monetaria BI", numeroCuenta: "GTQ-6930015505", banco: "Banco Industrial" } }` (los datos
  de cuenta también hardcodeados en el frontend por simplicidad, pero devolverlos aquí evita que se
  desincronicen si cambian).

### 3.3 Endpoint: subir comprobante — `POST /api/suscripciones/pagos/:pagoId/comprobante`
`verifyAlumnoJWT`, multipart con `multer` (**reutilizar el mismo patrón ya usado en
`backend/src/routes/inscripciones.ts`**: `multer({ storage: multer.memoryStorage(), limits: {
fileSize: ... } })` — subir el límite a 10MB para fotos de boleta).
- Verifica que el `PagoSuscripcion` pertenezca a una `Suscripcion` del alumno autenticado (404/403
  si no).
- Body adicional: `{ mesPagado: string }` (formato `"YYYY-MM"`, default al mes actual si no se
  manda).
- Sube el archivo con `subirComprobanteDeposito`, guarda `comprobanteUrl`, `comprobanteDriveId`,
  `mesPagado` en el `PagoSuscripcion`. El `estado` se mantiene `PENDIENTE` (queda a la espera de
  confirmación manual).
- Si `isDriveConfigured()` es `false`, responder 503 con mensaje claro (mismo patrón defensivo que
  ya usa el resto del proyecto con Redis/R2 — no debe tumbar el request, debe avisar con un error
  legible).

### 3.4 Endpoints admin — nuevo archivo `backend/src/routes/pagos-deposito.ts`
Montar bajo `/api/admin/pagos-deposito`, todos con `verifyJWT`.
- `GET /` — lista `PagoSuscripcion` con `proveedor: "deposito_bi"`, filtrable por `estado` (query
  param), incluye `suscripcion.alumno` (nombre, apellido, carnet, email) y
  `suscripcion.planPrecio.plan` (nombre) para mostrar en la tabla.
- `PATCH /:id/confirmar` — `auditLog`. Pone `PagoSuscripcion.estado = "COMPLETADO"`,
  `pagadoEn = now`. Activa la `Suscripcion`: si `fechaInicio` es null la setea a `now`; calcula
  `fechaFin` con `agregarMeses(fechaInicio, planPrecio.duracionMeses)` — **reutilizar la función
  `agregarMeses` de `backend/src/lib/recurrente.ts`, no reimplementar la lógica de fechas** (ya
  tiene tests en `test-fase3.ts`). Pone `Suscripcion.estado = "ACTIVA"`.
- `PATCH /:id/rechazar` — `auditLog`. Body opcional `{ motivo?: string }`. Pone
  `PagoSuscripcion.estado = "RECHAZADO"`. La `Suscripcion` se queda en `PENDIENTE` — si el alumno
  quiere reintentar, vuelve a llamar `checkout-manual` (crea un `PagoSuscripcion` nuevo; no hace
  falta una máquina de estados más compleja para esto).

## 4. Frontend

### 4.1 `lib/pago-deposito.ts` (nuevo, pequeño)
Constante con los datos de cuenta (para mostrarlos sin esperar la respuesta del backend, y como
fallback si el fetch falla):
```ts
export const CUENTA_DEPOSITO = {
  banco: "Banco Industrial",
  nombreCuenta: "Corporacion ME",
  tipoCuenta: "Cuenta monetaria BI",
  numeroCuenta: "GTQ-6930015505",
};
```

### 4.2 `components/planes/CheckoutClient.tsx` (modificar)
Reemplazar la llamada a `alumnoApi.checkout()` (que hoy redirige a Recurrente) por el nuevo flujo,
en dos pasos dentro de la misma página:
1. **Paso 1 — datos de depósito**: al entrar, llama `checkout-manual`, muestra el monto exacto a
   pagar y la tarjeta con los datos de `CUENTA_DEPOSITO` (banco, nombre, tipo, número — con botón
   "copiar" en el número de cuenta, patrón común en este tipo de pantallas).
2. **Paso 2 — subir boleta**: input de archivo (imagen o PDF) + selector de mes a pagar (default:
   mes actual) + botón "Enviar comprobante" → `POST .../comprobante`. Al terminar, mensaje de
   confirmación: "Recibimos tu comprobante, nuestro equipo lo va a confirmar en las próximas horas."

### 4.3 `lib/alumno-api.ts` (extender)
Agregar `checkoutManual(planPrecioId)` y `subirComprobante(pagoId, formData)` al objeto `alumnoApi`,
mismo patrón que las funciones existentes.

### 4.4 Panel admin — nueva página `app/admin/pagos-deposito/page.tsx`
Tabla con: alumno, plan, monto, mes pagado, fecha de envío, estado (badge), link "Ver boleta" (abre
`comprobanteUrl` de Drive en pestaña nueva), botones "Confirmar" / "Rechazar" para las filas
`PENDIENTE`. Reutilizar los patrones de tabla/layout ya usados en las otras páginas de `/admin`
(ej. `/admin/leads`, `/admin/finanzas`) para mantener consistencia visual — no inventar un sistema
de diseño nuevo para esta página.

## 5. Variables de entorno nuevas (usuario debe agregarlas en Railway)

- `GOOGLE_DRIVE_PAGOS_FOLDER_ID` — id de una carpeta de Google Drive ya creada ("Pagos con
  depósito"), compartida con las mismas credenciales de Drive que ya están configuradas para
  backups (`GOOGLE_OAUTH_CLIENT_ID`/`SECRET`/`REFRESH_TOKEN` o `GOOGLE_SERVICE_ACCOUNT_JSON`, que
  ya existen). Si no está seteada, `isDriveConfigured()` seguirá funcionando pero la subida de
  comprobantes debe fallar con un 503 claro en vez de subir a la raíz de un Drive personal.

## 6. Qué NO hacer en este PRD

- No tocar `lib/recurrente.ts`, `routes/webhooks-recurrente.ts`, ni la rama `proveedor:
  "recurrente"` del checkout — quedan intactos para reactivarse más adelante.
- No tocar `routes/crm.ts`, `Lead`, `CRMEtapa` — el nuevo panel de pagos es independiente del
  pipeline de ventas.
- No enlazar nada de esto a la landing pública (`app/page.tsx`) — `/checkout` y `/planes` siguen
  sin estar enlazados desde la home, por la instrucción vigente del usuario de no unir la landing
  hasta que todo esté aprobado.

## 7. Criterios de aceptación (QA)

- [ ] Al elegir un plan en `/checkout/[planPrecioId]`, el alumno ve los datos de la cuenta de
      Banco Industrial (Corporacion ME, Cuenta monetaria BI, GTQ-6930015505) y el monto exacto a
      pagar — no se le redirige a Recurrente.
- [ ] El alumno puede subir una foto/PDF de la boleta desde el sitio, indicando el mes que cubre.
- [ ] El archivo queda en Google Drive, dentro de "Pagos con depósito" → carpeta del alumno →
      carpeta del mes.
- [ ] El `PagoSuscripcion` queda en estado `PENDIENTE` con el link al comprobante guardado.
- [ ] Desde `/admin/pagos-deposito`, el equipo ve la lista de comprobantes pendientes, puede abrir
      la boleta en Drive, y confirmar o rechazar.
- [ ] Al confirmar, la `Suscripcion` pasa a `ACTIVA` con `fechaInicio`/`fechaFin` calculados
      correctamente (mismo cálculo que ya usa el webhook de Recurrente).
- [ ] El código de Recurrente sigue intacto y compilando (no se rompe nada existente).
- [ ] `tsc --noEmit` sin errores y build de producción pasa.
