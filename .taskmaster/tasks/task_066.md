# Task ID: 66

**Title:** Register Twilio webhook route and configure urlencoded parser in index.ts

**Status:** done

**Dependencies:** 62 ✓

**Priority:** high

**Description:** Mount Twilio webhook router with proper middleware order in main Express app

**Details:**

Modify backend/src/index.ts:

1. Import Twilio router:
```typescript
import twilioWebhookRouter from './routes/twilio.webhook';
```

2. Add urlencoded parser BEFORE mounting Twilio router (after line 39, before routes):
```typescript
// Twilio sends form-urlencoded data
app.use(express.urlencoded({ extended: false }));
```

3. Mount Twilio webhook route (after other routes, around line 54):
```typescript
app.use('/api/twilio/webhook', twilioWebhookRouter);
```

Order matters: helmet → cors → json parser → urlencoded parser → routes. The urlencoded middleware is needed specifically for Twilio (Meta sends JSON). Mount route at /api/twilio/webhook to match Twilio console configuration.

**Test Strategy:**

Start server and verify no errors. Check that route is registered by inspecting logs or making test request. Verify urlencoded parser is active by sending test POST with form data to /api/twilio/webhook. Confirm order: helmet and cors apply before parsers, parsers apply before routes.
