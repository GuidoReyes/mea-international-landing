# Task ID: 62

**Title:** Create Twilio webhook route handler

**Status:** done

**Dependencies:** 60 ✓, 61 ✓

**Priority:** high

**Description:** Implement POST /api/twilio/webhook route to handle admin replies and bot reactivation commands

**Details:**

Create backend/src/routes/twilio.webhook.ts:

```typescript
import { Router, Request, Response } from 'express';
import { verifyTwilioSignature } from '../middleware/twilio-webhook.middleware';
import { sendWhatsAppMessage } from '../lib/whatsapp-send';
import { activarModoHumano, desactivarModoHumano } from '../lib/human-handoff';
import { sendTwilioWhatsApp } from '../lib/twilio-send';
import { log } from '../lib/logger';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', verifyTwilioSignature, async (req: Request, res: Response) => {
  const { From, Body } = req.body as { From?: string; Body?: string };

  if (!From || !Body) {
    res.status(400).send('Missing From or Body');
    return;
  }

  const adminPhone = From.replace('whatsapp:', '');
  const message = Body.trim();

  log('info', `[Twilio] Message from admin: "${message.slice(0, 60)}"`);

  // Format 1: [+502XXXXXXXX] response text
  const replyMatch = message.match(/^\[(\+?\d+)\]\s*(.+)$/s);
  if (replyMatch) {
    const clientPhone = replyMatch[1].replace(/^\+/, '');
    const responseText = replyMatch[2];

    await activarModoHumano(clientPhone);
    const sent = await sendWhatsAppMessage(clientPhone, responseText);

    if (sent.success) {
      log('info', `[Twilio] Admin response sent to ${clientPhone}`);
      
      // Save message to DB as asesor message
      try {
        const lead = await prisma.lead.findUnique({ where: { telefono: clientPhone } });
        if (lead) {
          const conv = await prisma.conversacion.findFirst({
            where: { leadId: lead.id },
            orderBy: { creadoEn: 'desc' }
          });
          if (conv) {
            await prisma.mensaje.create({
              data: {
                conversacionId: conv.id,
                esDeCliente: false,
                contenido: responseText,
                rol: 'asesor'
              }
            });
          }
        }
      } catch (err) {
        log('error', '[Twilio] Error saving admin message to DB:', err);
      }
    }

    res.status(200).send(''); // Twilio requires 200 response
    return;
  }

  // Format 2: /bot [+502XXXXXXXX]
  const botMatch = message.match(/^\/bot\s+\[(\+?\d+)\]$/);
  if (botMatch) {
    const clientPhone = botMatch[1].replace(/^\+/, '');
    await desactivarModoHumano(clientPhone);
    await sendTwilioWhatsApp(From, `✅ Bot reactivado para ${clientPhone}`);
    log('info', `[Twilio] Bot reactivated for ${clientPhone}`);
    res.status(200).send('');
    return;
  }

  // Invalid format — send help message
  await sendTwilioWhatsApp(
    From,
    'Formato de respuesta:\n[+502XXXXXXXX] Tu mensaje\n\nPara reactivar bot:\n/bot [+502XXXXXXXX]'
  );
  res.status(200).send('');
});

export default router;
```

Handle two command formats. Always return 200 (Twilio retries if not 200 within 15s). Save admin messages to DB with rol='asesor'.

**Test Strategy:**

Test admin sends '[+502XXXXXXXX] Test response' → verify client receives message, modoHumano activated, message saved to DB. Test '/bot [+502XXXXXXXX]' → verify modoHumano deactivated, admin receives confirmation. Test invalid format → verify admin receives help message. All tests should verify 200 response.

## Subtasks

### 62.1. Create lib/twilio-send.ts utility function

**Status:** pending  
**Dependencies:** None  

Implement sendTwilioWhatsApp function to send WhatsApp messages via Twilio API with error handling and logging

**Details:**

Create backend/src/lib/twilio-send.ts following the pattern from whatsapp-send.ts. Implement sendTwilioWhatsApp(to: string, body: string): Promise<SendTwilioResult> with SendTwilioResult interface containing {success: boolean, sid?: string, error?: string}. Use twilio npm package (already installed per dependency task 59). Retrieve TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER from environment. Initialize Twilio client: const client = twilio(accountSid, authToken). Send message using client.messages.create({ from, to, body }). Wrap in try/catch, log success with log('info', ...) and errors with log('error', ...). Return {success: true, sid: message.sid} on success or {success: false, error: errorMsg} on failure. Follow the error handling pattern from whatsapp-send.ts but without retry logic (Twilio SDK handles retries). Ensure 'to' parameter is in E.164 format (whatsapp:+502XXXXXXXX).

### 62.2. Create middleware/twilio-webhook.middleware.ts for signature verification

**Status:** pending  
**Dependencies:** 62.1  

Implement verifyTwilioSignature middleware to validate webhook authenticity using Twilio signature verification

**Details:**

Create backend/src/middleware/twilio-webhook.middleware.ts following the pattern from hmac.middleware.ts. Import crypto.createHmac and twilio.validateRequest (or manual implementation). Implement verifyTwilioSignature(req: Request, res: Response, next: NextFunction). Retrieve X-Twilio-Signature header. Get TWILIO_AUTH_TOKEN from env as signing secret. Construct full URL: const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`. Compute expected signature using Twilio's algorithm (HMAC-SHA1 of URL + sorted POST params). Use timing-safe comparison (timingSafeEqual) to compare signatures. If missing signature: res.status(403).json({error: 'Missing signature'}). If invalid: res.status(403).json({error: 'Invalid signature'}). If valid: call next(). Follow security pattern from hmac.middleware.ts for timing-safe comparison and error responses.

### 62.3. Implement POST /api/twilio/webhook route handler logic

**Status:** pending  
**Dependencies:** 62.1, 62.2  

Create routes/twilio.webhook.ts with route handler to process admin reply and bot reactivation commands

**Details:**

Create backend/src/routes/twilio.webhook.ts. Import Router, Request, Response from express. Import verifyTwilioSignature, sendWhatsAppMessage, activarModoHumano, desactivarModoHumano, sendTwilioWhatsApp, log, prisma. Create router = Router(). Implement POST '/' route with verifyTwilioSignature middleware. Extract {From, Body} from req.body. Validate both exist, return 400 if missing. Parse adminPhone from From (remove 'whatsapp:' prefix). Log incoming message with log('info', ...). Implement reply format parsing: regex /^\[(\+?\d+)\]\s*(.+)$/s to match '[+502XXXXXXXX] response text'. If match: extract clientPhone and responseText, call activarModoHumano(clientPhone), call sendWhatsAppMessage(clientPhone, responseText), save to DB (see subtask 4 for DB logic), return 200. Implement bot reactivation: regex /^\/bot\s+\[(\+?\d+)\]$/ to match '/bot [+502XXXXXXXX]'. If match: extract clientPhone, call desactivarModoHumano(clientPhone), send confirmation to admin via sendTwilioWhatsApp(From, '✅ Bot reactivado...'), return 200. If no match: send help message to admin via sendTwilioWhatsApp with format instructions, return 200. Always return 200 status (Twilio retries non-200 responses within 15s). Follow pattern from whatsapp.webhook.ts for structure and error handling.

### 62.4. Implement database persistence for admin replies with rol='asesor'

**Status:** pending  
**Dependencies:** 62.3  

Add database save logic to store admin messages in MensajeWhatsApp table with rol='asesor' when admin sends reply

**Details:**

In routes/twilio.webhook.ts, within the reply format handling block (after successful sendWhatsAppMessage), add database save logic. Wrap in try/catch to prevent DB errors from failing webhook response (follow pattern from persistence.ts). Use prisma.lead.findUnique({ where: { telefono: clientPhone } }) to find lead. If lead exists: find most recent active conversation using prisma.conversacionWhatsApp.findFirst({ where: { leadId: lead.id, estado: 'activo' }, orderBy: { creadoEn: 'desc' } }). If conversation exists: create mensaje with prisma.mensajeWhatsApp.create({ data: { conversacionId: conv.id, rol: 'asesor', contenido: responseText } }). Use rol='asesor' to differentiate from 'user' (client) and 'assistant' (Claude bot) messages. Log success with log('info', '[Twilio] Admin message saved to DB'). Catch errors with log('error', '[Twilio] Error saving admin message to DB:', err). Do NOT let DB errors throw - webhook must always return 200. Follow silent failure pattern from guardarMensajes in persistence.ts.

### 62.5. Register Twilio webhook route in backend/src/index.ts

**Status:** pending  
**Dependencies:** 62.4  

Add Twilio webhook router to Express app routing configuration at /api/twilio/webhook

**Details:**

Open backend/src/index.ts. Import twilioWebhookRouter: import twilioWebhookRouter from './routes/twilio.webhook'. Add route registration after existing webhook routes (after line 48): app.use('/api/twilio/webhook', twilioWebhookRouter). Follow the pattern of whatsappWebhookRouter registration. Ensure placement is after express.json() middleware setup (line 34-39) so req.body is parsed. Position before test endpoint block (line 57). This makes the webhook accessible at POST /api/twilio/webhook for Twilio to send admin messages. No authentication middleware needed - signature verification is handled in the route middleware.
