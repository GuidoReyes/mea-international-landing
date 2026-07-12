# Task ID: 7

**Title:** Implement Meta WhatsApp Webhook with HMAC Validation

**Status:** done

**Dependencies:** 1 ✓

**Priority:** high

**Description:** Create webhook endpoint to receive WhatsApp messages with HMAC-SHA256 signature verification and Meta verification endpoint.

**Details:**

Create `src/middleware/hmac.middleware.ts`: implement verifyMetaHmac function that reads x-hub-signature-256 header, computes HMAC-SHA256 hash of raw request body using META_APP_SECRET, compares with received signature, returns 403 if mismatch. Create `src/routes/whatsapp.webhook.ts` with Router. Implement GET /api/meta/webhook for Meta verification: read hub.mode, hub.verify_token, hub.challenge from query params, if mode='subscribe' and verify_token matches META_WEBHOOK_VERIFY_TOKEN, respond with hub.challenge, else 403. Implement POST /api/meta/webhook: apply verifyMetaHmac middleware, extract messages from body.entry[0].changes[0].value.messages array, for each message extract from (phone), text.body, call placeholder handler function (will integrate Claude AI in next task), respond 200 immediately to Meta. Add to Railway env: META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, META_WHATSAPP_TOKEN, META_PHONE_ID, META_WABA_ID.

**Test Strategy:**

Configure webhook URL in Meta Business Manager (https://api.meainternational.com/api/meta/webhook). Test verification with Meta's validation request. Send test message from WhatsApp, verify POST webhook receives it. Test HMAC validation by sending request with invalid signature (should get 403). Check Railway logs show message received.

## Subtasks

### 7.1. Create HMAC signature verification middleware for Meta webhooks

**Status:** pending  
**Dependencies:** None  

Implement verifyMetaHmac middleware function that validates incoming webhook requests using HMAC-SHA256 signature verification against the x-hub-signature-256 header.

**Details:**

Create file backend/src/middleware/hmac.middleware.ts. Import crypto module from Node.js to compute HMAC-SHA256 hash. Implement Express middleware function verifyMetaHmac(req, res, next) that: (1) Reads x-hub-signature-256 header from request (format: 'sha256=<hash>'), (2) Extracts raw request body as string (requires express.text() or express.raw() middleware before JSON parsing), (3) Computes HMAC-SHA256 hash using crypto.createHmac('sha256', process.env.META_APP_SECRET).update(rawBody).digest('hex'), (4) Compares computed hash with received signature using crypto.timingSafeEqual() to prevent timing attacks, (5) Returns 403 Forbidden with { error: 'Invalid signature' } if mismatch, (6) Calls next() if signature is valid. Add TypeScript types for Express Request, Response, NextFunction. Export verifyMetaHmac function. Note: Meta sends signature as 'sha256=' prefix + hex hash.

### 7.2. Create WhatsApp webhook router with GET endpoint for Meta verification

**Status:** pending  
**Dependencies:** None  

Implement GET /api/meta/webhook endpoint that handles Meta's webhook verification challenge during webhook setup in Meta Business Manager.

**Details:**

Create file backend/src/routes/whatsapp.webhook.ts. Import express Router. Create Express Router instance. Implement GET /api/meta/webhook endpoint that: (1) Extracts query parameters hub.mode, hub.verify_token, and hub.challenge using req.query, (2) Checks if hub.mode === 'subscribe' AND hub.verify_token === process.env.META_WEBHOOK_VERIFY_TOKEN, (3) If both conditions are true, responds with plain text hub.challenge value (res.status(200).send(req.query['hub.challenge'])), (4) If verification fails, responds with 403 Forbidden. Add TypeScript interface for query parameters. Export router. This endpoint is called once by Meta when configuring the webhook URL and is required for initial webhook setup.

### 7.3. Implement POST webhook endpoint with HMAC middleware to receive WhatsApp messages

**Status:** pending  
**Dependencies:** 7.1, 7.2  

Create POST /api/meta/webhook endpoint that receives incoming WhatsApp messages, validates HMAC signature, and extracts message data from Meta's webhook payload structure.

**Details:**

In backend/src/routes/whatsapp.webhook.ts, implement POST /api/meta/webhook endpoint with: (1) Apply verifyMetaHmac middleware imported from hmac.middleware.ts as first middleware in chain, (2) Use express.json() to parse request body (note: ensure raw body is available for HMAC verification - may need custom middleware to store rawBody before JSON parsing), (3) Extract messages from nested payload: body.entry[0]?.changes[0]?.value?.messages array, (4) For each message in array, extract: from (sender phone number), text.body (message text content), (5) Call placeholder handler function handleWhatsAppMessage(from, text) that logs to console for now (will be replaced with Claude AI integration in Task 10), (6) Respond with 200 OK immediately to Meta within 20 seconds (required by Meta to acknowledge receipt). Add error handling: wrap in try-catch, log errors, always return 200 to Meta even if internal processing fails. Add TypeScript interfaces for Meta webhook payload structure (entry, changes, value, messages).

### 7.4. Add WhatsApp webhook environment variables to Railway configuration

**Status:** pending  
**Dependencies:** None  

Configure all required Meta WhatsApp API credentials and tokens as environment variables in Railway backend service settings.

**Details:**

Access Railway project dashboard (created in Task 2), navigate to backend service settings, and add the following environment variables in the Variables section: (1) META_WEBHOOK_VERIFY_TOKEN - Generate random string (e.g., `openssl rand -hex 16`) for webhook verification, (2) META_APP_SECRET - Copy from Meta App Dashboard > Settings > Basic > App Secret (used for HMAC signature verification), (3) META_WHATSAPP_TOKEN - Copy from Meta App Dashboard > WhatsApp > API Setup > Temporary/Permanent Access Token (Bearer token for WhatsApp Cloud API), (4) META_PHONE_ID - Copy from Meta App Dashboard > WhatsApp > API Setup > Phone Number ID (unique ID for WhatsApp Business phone number), (5) META_WABA_ID - Copy from Meta App Dashboard > WhatsApp Business Account ID. Document all values securely. Update backend/.env.example to include these variables with placeholder values. These credentials are required for webhook verification (META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET) and sending messages (META_WHATSAPP_TOKEN, META_PHONE_ID, META_WABA_ID).

### 7.5. Mount WhatsApp webhook router and configure raw body handling in Express

**Status:** pending  
**Dependencies:** 7.2, 7.3  

Integrate the WhatsApp webhook router into the main Express application at /api/meta/webhook path and configure middleware to preserve raw request body for HMAC verification while still parsing JSON.

**Details:**

Update backend/src/index.ts to: (1) Import whatsappWebhookRouter from './routes/whatsapp.webhook', (2) Add custom middleware BEFORE express.json() to capture raw body: app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } })) - this stores raw body in req.rawBody for HMAC verification, (3) Mount webhook router: app.use('/api/meta/webhook', whatsappWebhookRouter), (4) Ensure CORS middleware allows Meta webhook origin (Meta sends from Facebook IPs, allow all origins for webhook or specific Meta IP ranges), (5) Update TypeScript declaration to extend Express Request interface with rawBody property: create types/express.d.ts with: declare global { namespace Express { interface Request { rawBody?: string; } } }. Test that both GET (verification) and POST (message receiving) endpoints are accessible at http://localhost:4000/api/meta/webhook. Order is critical: rawBody capture must happen before json parsing but HMAC middleware must access rawBody during POST request.
