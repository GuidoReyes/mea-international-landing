# Task ID: 12

**Title:** Integrate Claude AI Agent into WhatsApp Webhook

**Status:** done

**Dependencies:** 7 ✓, 8 ✓, 10 ✓, 11 ✓

**Priority:** high

**Description:** Connect all components: webhook receives message, calls Claude AI agent, persists conversation, sends response back to user via WhatsApp.

**Details:**

Update `src/routes/whatsapp.webhook.ts` POST handler. For each incoming message: 1) Extract telefono (from) and mensaje (text.body). 2) Call responderMensaje(telefono, mensaje) to get Claude AI response. 3) Call guardarMensajes(telefono, mensaje, response). 4) Call sendWhatsAppMessage(telefono, response). 5) Always respond 200 to Meta immediately (within 20 seconds) even if internal processing fails. Use try-catch to handle errors: if Claude or WhatsApp send fails, log error, still persist what we can, and send generic error message to user ('Lo siento, hubo un error. Un asesor se pondrá en contacto.'). Implement rate limiting per phone number (max 10 messages per minute) to prevent abuse. Add logging for all steps.

**Test Strategy:**

Send WhatsApp message to MEA number. Verify receives response within 10 seconds. Check database has Lead, Conversacion, and both messages. Verify Redis has conversation history. Test multi-message conversation - verify context is maintained. Test error scenarios (Claude API down, Redis down) - verify graceful degradation. Monitor Railway logs during test.

## Subtasks

### 12.1. Implement rate limiting middleware for WhatsApp messages

**Status:** pending  
**Dependencies:** None  

Create Express middleware that enforces rate limits of 10 messages per minute per phone number to prevent abuse and API quota exhaustion.

**Details:**

Create backend/src/middleware/rate-limit.middleware.ts. Implement in-memory rate limiting using Map<string, {count: number, resetAt: number}> to track message counts per phone number. Create Express middleware function rateLimitWhatsApp(req, res, next) that: (1) Extracts phone number from request body (body.entry[0]?.changes[0]?.value?.messages[0]?.from), (2) Gets current timestamp and checks if phone number exists in rate limit map, (3) If resetAt timestamp has passed, resets count to 0 and updates resetAt to Date.now() + 60000 (1 minute), (4) Increments count for phone number, (5) If count > 10, responds with 200 OK to Meta (required to avoid webhook failures) but logs warning and returns early without processing message, (6) Otherwise calls next() to proceed. Add cleanup logic to remove expired entries from map every 5 minutes to prevent memory leaks. Export rateLimitWhatsApp function. This prevents users from spamming the bot and protects Claude API quota.

### 12.2. Update webhook POST handler to integrate all components with error handling

**Status:** pending  
**Dependencies:** 12.1  

Modify the existing POST /api/meta/webhook handler in whatsapp.webhook.ts to call responderMensaje, guardarMensajes, and sendWhatsAppMessage functions with comprehensive error handling and logging.

**Details:**

In backend/src/routes/whatsapp.webhook.ts, update the POST handler implementation: (1) Import rateLimitWhatsApp from '../middleware/rate-limit.middleware', responderMensaje from '../lib/claude', guardarMensajes from '../lib/persistence', sendWhatsAppMessage from '../lib/whatsapp-send'. (2) Apply rateLimitWhatsApp middleware to POST route before existing HMAC middleware. (3) In route handler, wrap entire message processing in try-catch block. (4) For each message extracted from webhook payload: extract telefono from message.from and mensaje from message.text?.body, skip if mensaje is undefined/empty. (5) Call const respuesta = await responderMensaje(telefono, mensaje) to get Claude AI response. (6) Call await guardarMensajes(telefono, mensaje, respuesta) to persist to database (wrap in separate try-catch - don't let persistence failure stop response sending). (7) Call await sendWhatsAppMessage(telefono, respuesta) to send response back to user (wrap in try-catch). (8) Log each step with phone number for debugging. (9) If any critical error occurs (Claude fails, WhatsApp send fails), log error details, attempt to send generic error message to user: 'Lo siento, hubo un error. Un asesor se pondrá en contacto.' (10) Always respond 200 OK to Meta within 20 seconds regardless of internal processing success/failure - use res.status(200).send('OK') at the end. (11) Consider using async processing: respond 200 immediately, then process message in background (optional for v1).

### 12.3. Add comprehensive logging for all integration steps

**Status:** pending  
**Dependencies:** 12.2  

Implement structured logging throughout the webhook handler and all integrated functions to enable debugging and monitoring in production.

**Details:**

In backend/src/routes/whatsapp.webhook.ts POST handler and all integrated functions (responderMensaje, guardarMensajes, sendWhatsAppMessage), add console.log statements with consistent format: '[WhatsApp] {timestamp} | {phone} | {step} | {details}'. Log the following key events: (1) 'Message received' with phone number and message preview (first 50 chars), (2) 'Rate limit check' with current count, (3) 'Claude AI called' with phone number, (4) 'Claude AI response' with phone and response length, (5) 'Database persistence started', (6) 'Database persistence completed' or 'Database persistence failed' with error, (7) 'WhatsApp send started', (8) 'WhatsApp send completed' with message_id or 'WhatsApp send failed' with error, (9) '200 response sent to Meta'. For errors, log full error stack trace. Consider using a logging library like winston or pino for structured JSON logs (optional for v1, console.log acceptable). Ensure no sensitive data (API keys, full phone numbers) are logged - mask phone numbers to show only last 4 digits in logs: `XXX-XXX-${telefono.slice(-4)}`. All logs should be visible in Railway logs for real-time monitoring.

### 12.4. Add end-to-end integration test and validate Meta webhook compliance

**Status:** pending  
**Dependencies:** 12.3  

Create comprehensive test that validates the full integration flow from webhook receipt to response sending, and verify Meta webhook response time requirements are met.

**Details:**

Create backend/tests/integration/whatsapp-integration.test.ts (or manual test script). Test full flow: (1) Prepare test environment with valid ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL, META credentials. (2) Send POST request to /api/meta/webhook with valid HMAC signature and Meta webhook payload containing test message from test phone number (format: {entry: [{changes: [{value: {messages: [{from: '1234567890', text: {body: 'Hola, información sobre cursos por favor'}}]}}]}]}). (3) Measure response time - MUST return 200 within 20 seconds (Meta requirement). (4) Wait 5 seconds for async processing to complete. (5) Query MySQL database to verify: Lead exists with telefono='1234567890', ConversacionWhatsApp exists linked to Lead, two MensajeWhatsApp records exist (one user role, one assistant role). (6) Check Redis key 'chat:1234567890' exists and contains conversation history array. (7) Verify test phone number received WhatsApp message (manual verification or use Meta test API). (8) Test multi-turn conversation: send second message referencing first ('¿Cuánto cuesta?'), verify Claude response shows context awareness. (9) Test rate limiting: send 11 messages rapidly, verify 11th is rate limited. (10) Document test results and any issues. Add test to Railway deployment pipeline (optional - can be manual test for v1).
