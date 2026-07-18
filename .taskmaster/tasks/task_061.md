# Task ID: 61

**Title:** Create Twilio webhook signature verification middleware

**Status:** done

**Dependencies:** 59 ✓

**Priority:** high

**Description:** Implement middleware to verify X-Twilio-Signature header using HMAC-SHA1 validation

**Details:**

Create backend/src/middleware/twilio-webhook.middleware.ts:

```typescript
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { log } from '../lib/logger';

export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-twilio-signature'] as string | undefined;
  
  if (!signature) {
    log('error', '[Twilio] Missing X-Twilio-Signature header');
    res.status(403).json({ error: 'Missing signature' });
    return;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    log('error', '[Twilio] TWILIO_AUTH_TOKEN not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  // Twilio validates URL + params (form-urlencoded body)
  const url = `https://${req.headers.host}${req.originalUrl}`;
  const params = req.body || {};

  const isValid = twilio.validateRequest(authToken, signature, url, params);

  if (!isValid) {
    log('error', '[Twilio] Invalid webhook signature');
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
```

Use twilio.validateRequest() from SDK (similar pattern to verifyMetaHmac). Twilio sends form-urlencoded data, not JSON. Signature validates URL + body params.

**Test Strategy:**

Test with valid Twilio webhook request (can simulate using Twilio CLI or test sandbox). Verify middleware passes with valid signature. Test invalid signature returns 403. Test missing signature returns 403. Test missing TWILIO_AUTH_TOKEN returns 500.
