# PRD: Integración Twilio para Monitoreo y Handoff desde WhatsApp Personal

## Contexto

El sistema actual tiene un bot WhatsApp conectado al número 50256311728 vía Meta Cloud API. El bot ya soporta modo humano (`human-handoff.ts`) y escalaciones que notifican al asesor vía `MIRCE_PERSONAL_PHONE`. El problema: las notificaciones al asesor se envían usando la Meta API, y cuando el asesor intenta responder al cliente desde su WhatsApp personal, no puede hacerlo como el número de negocio (50256311728). El asesor tendría que acceder al panel Meta para contestar, lo que es impracticable.

**Solución**: Usar Twilio como puente bidireccional:
- El backend envía notificaciones de conversaciones al WhatsApp personal del admin vía Twilio
- El admin ve los mensajes en su WhatsApp y puede contestar respondiendo al número Twilio
- Twilio envía ese reply al webhook del backend
- El backend parsea el reply y lo envía al cliente usando la API de Meta

El admin nunca sale de WhatsApp. Puede monitorear el bot y contestar manualmente sin acceder a ningún panel.

**Número de negocio MEA**: 50256311728 (Meta Cloud API, permanece sin cambios)
**Número Twilio**: nuevo número habilitado para WhatsApp (solo para comunicación admin ↔ backend)

---

## Objetivo

1. El admin recibe en su WhatsApp personal (vía Twilio) una copia de cada mensaje que llega al bot y la respuesta del bot.
2. El admin puede contestar al cliente desde su WhatsApp respondiendo al número Twilio con el formato: `[+502XXXXXXXX] Texto de respuesta`
3. El backend recibe el reply del admin vía Twilio webhook, lo parsea, y lo envía al cliente vía Meta API.
4. El backend activa `modoHumano` para esa conversación cuando el admin contesta manualmente.
5. El admin puede reactivar el bot enviando `/bot [+502XXXXXXXX]` al número Twilio.

---

## Tareas requeridas

### Task: Configuración de cuenta Twilio y número WhatsApp

Crear y configurar la cuenta Twilio con un número habilitado para WhatsApp. Hay dos opciones:
- **Sandbox Twilio**: número compartido gratuito para pruebas, ideal para verificar el flujo antes de invertir. El admin hace opt-in enviando "join <palabra>-<palabra>" al número sandbox desde su WhatsApp.
- **Número Twilio propio con WhatsApp**: número dedicado aprobado por Meta para WhatsApp Business. Costo mensual. Recomendado para producción.

Para el objetivo de monitoreo y prueba, empezar con Sandbox. Los pasos:
1. Crear cuenta en twilio.com con el email ghreyes.montenegro@gmail.com
2. Ir a Messaging → Try it Out → Send a WhatsApp Message → Sandbox
3. Anotar el número sandbox (ej: whatsapp:+14155238886) y el código join
4. El admin hace opt-in desde su WhatsApp personal enviando "join <código>" al número sandbox
5. Anotar: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER

Subtasks:
- Crear cuenta Twilio y activar WhatsApp Sandbox
- Hacer opt-in del número personal del admin (+50256311728 personal o el número real del admin) al Sandbox
- Recopilar y documentar las 5 variables de entorno necesarias

### Task: Agregar variables de entorno Twilio en Railway

Agregar en el servicio backend de Railway las siguientes variables:
- TWILIO_ACCOUNT_SID: de la consola Twilio
- TWILIO_AUTH_TOKEN: de la consola Twilio
- TWILIO_WHATSAPP_NUMBER: número Twilio en formato whatsapp:+14155238886
- ADMIN_TWILIO_WHATSAPP: número personal del admin en formato whatsapp:+502XXXXXXXX (el que hizo opt-in)

Verificar que MIRCE_PERSONAL_PHONE también esté configurado (ya existente, para escalaciones vía Meta).

### Task: Instalar SDK Twilio en backend

En el directorio `backend/`, instalar el paquete oficial:
```bash
npm install twilio
npm install --save-dev @types/twilio
```

Verificar que `package.json` incluye twilio como dependencia de producción.

### Task: Crear lib twilio-send.ts

Crear `backend/src/lib/twilio-send.ts` con la función `sendTwilioWhatsApp(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }>`.

Usar el cliente Twilio REST API:
```typescript
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
await client.messages.create({
  from: process.env.TWILIO_WHATSAPP_NUMBER, // whatsapp:+14155238886
  to: `whatsapp:${to}`,
  body
});
```

Incluir manejo de errores y logging con `log()`. No reintentos (Twilio tiene retry interno).

### Task: Crear middleware de verificación de firma Twilio

Crear `backend/src/middleware/twilio-webhook.middleware.ts`.

Twilio firma cada request con `X-Twilio-Signature` usando HMAC-SHA1 sobre la URL + parámetros del body. Usar `twilio.validateRequest(authToken, signature, url, params)` del SDK. Si la verificación falla, responder 403.

Capturar el raw body en `express.urlencoded({ extended: false })` (Twilio envía form-urlencoded, no JSON).

### Task: Crear ruta twilio.webhook.ts

Crear `backend/src/routes/twilio.webhook.ts` con:

**POST /** — recibe mensajes del admin vía Twilio:
1. Parsear `req.body`: campos `From` (número admin), `Body` (texto del mensaje)
2. Detectar dos formatos posibles del admin:
   - `[+502XXXXXXXX] texto de respuesta` → responde al cliente ese número
   - `/bot [+502XXXXXXXX]` → reactiva el bot para ese cliente
   - Cualquier otro formato → responder al admin con mensaje de ayuda
3. Si es respuesta al cliente:
   - Extraer número de cliente del bracket: `[+502XXXXXXXX]`
   - Llamar `sendWhatsAppMessage(clientePhone, texto)` vía Meta API
   - Llamar `activarModoHumano(clientePhone)` para silenciar el bot en esa conv
   - Guardar el mensaje en BD como mensaje del asesor
   - Responder 200 con TwiML vacío (Twilio requiere TwiML response o 200 vacío)
4. Si es `/bot [+502XXXXXXXX]`:
   - Llamar `desactivarModoHumano(clientePhone)`
   - Enviar confirmación al admin vía Twilio
5. Responder siempre 200 (Twilio reenvía si no recibe 200 en <15s)

### Task: Actualizar notifications.ts — notificar al admin vía Twilio

Modificar `notifyAdminNewLead()` en `backend/src/services/notifications.ts`:
- Continuar enviando notificación vía Meta (al `ADMIN_WA_NUMBER`, ya implementado)
- TAMBIÉN enviar al admin vía Twilio (`ADMIN_TWILIO_WHATSAPP`) con el formato:
  ```
  🆕 Nuevo lead
  📱 [+502XXXXXXXX]
  💬 "primer mensaje del lead"
  
  Para responder manualmente envía:
  [+502XXXXXXXX] Tu respuesta aquí
  ```
- Importar y usar `sendTwilioWhatsApp` del nuevo lib

### Task: Actualizar claude.ts — escalación notifica vía Twilio con formato reply

Modificar la lógica de escalación en `backend/src/lib/claude.ts` (línea ~99):
- Actualmente envía WhatsApp al `MIRCE_PERSONAL_PHONE` vía Meta API
- Cambiar para enviar TAMBIÉN vía Twilio al admin con el formato de respuesta:
  ```
  🔔 Escalación requerida
  📱 [+502XXXXXXXX]
  💬 Motivo: <motivo>
  
  Para responder: [+502XXXXXXXX] Tu respuesta
  Para reactivar bot: /bot [+502XXXXXXXX]
  ```
- Mantener el envío vía Meta como fallback

### Task: Implementar forwarding de mensajes en tiempo real al admin

Modificar `backend/src/routes/whatsapp.webhook.ts` para que después de que el bot responda, envíe al admin vía Twilio un resumen de la conversación:

```
📩 Mensaje entrante
📱 [+502XXXXXXXX]
👤 "texto del cliente"
🤖 "respuesta del bot"
```

Esto le permite al admin monitorear todas las conversaciones en tiempo real desde su WhatsApp personal.

Nota: Solo hacer forwarding si `ADMIN_TWILIO_WHATSAPP` está configurado. Nunca bloquear el flujo principal si el envío Twilio falla.

### Task: Registrar ruta Twilio en index.ts

Modificar `backend/src/index.ts`:
1. Importar el router de Twilio
2. Agregar `app.use(express.urlencoded({ extended: false }))` ANTES del router de Twilio (Twilio envía form-urlencoded)
3. Montar: `app.use('/api/twilio/webhook', twilioRouter)`
4. Configurar la URL del webhook en la consola Twilio: `https://<railway-url>/api/twilio/webhook`

### Task: Configurar webhook URL en consola Twilio

En la consola Twilio → Messaging → Sandbox Settings (o el número configurado):
- Webhook URL: `https://<tu-dominio-railway>/api/twilio/webhook`
- Método: HTTP POST
- Verificar que esté guardado

### Task: Test end-to-end del flujo completo

Probar el flujo completo:
1. El admin envía un mensaje al número 50256311728 (bot MEA) desde un número diferente
2. Verificar que el admin recibe en su WhatsApp personal (vía Twilio) el resumen del mensaje + respuesta del bot
3. El admin responde desde su WhatsApp al número Twilio: `[+502XXXXXXXX] Hola, te llamo`
4. Verificar que el cliente recibe la respuesta del asesor (vía Meta)
5. Verificar que el bot queda en modoHumano para ese número
6. El admin envía `/bot [+502XXXXXXXX]` al número Twilio
7. Verificar que el bot retoma la conversación

Registrar resultados en Taskmaster con `task-master update-subtask`.

---

## Variables de entorno nuevas (resumen)

| Variable | Descripción |
|---|---|
| TWILIO_ACCOUNT_SID | SID de la cuenta Twilio |
| TWILIO_AUTH_TOKEN | Token de autenticación Twilio |
| TWILIO_WHATSAPP_NUMBER | Número Twilio ej: `whatsapp:+14155238886` |
| ADMIN_TWILIO_WHATSAPP | WhatsApp personal del admin ej: `whatsapp:+50256311728` |

## Archivos a crear/modificar

**Crear:**
- `backend/src/lib/twilio-send.ts`
- `backend/src/middleware/twilio-webhook.middleware.ts`
- `backend/src/routes/twilio.webhook.ts`

**Modificar:**
- `backend/src/index.ts` — registrar ruta + urlencoded parser
- `backend/src/services/notifications.ts` — agregar canal Twilio
- `backend/src/lib/claude.ts` — escalación también vía Twilio

## Dependencias

- Task de Setup Twilio debe completarse antes de cualquier tarea de implementación
- Railway vars deben estar antes de deploy
- Middleware de firma antes de la ruta
- La ruta antes del registro en index.ts
