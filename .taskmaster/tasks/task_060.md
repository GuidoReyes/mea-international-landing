# Task ID: 60

**Title:** Create lib/twilio-send.ts with sendTwilioWhatsApp function

**Status:** done

**Dependencies:** 59 ✓

**Priority:** high

**Description:** Implement Twilio WhatsApp message sending utility with error handling and logging

**Details:**

Create backend/src/lib/twilio-send.ts:

```typescript
import twilio from 'twilio';
import { log } from './logger';

interface SendTwilioResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendTwilioWhatsApp(to: string, body: string): Promise<SendTwilioResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    log('error', '[Twilio] Missing credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_NUMBER');
    return { success: false, error: 'Missing Twilio credentials' };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      from, // whatsapp:+14155238886
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body
    });

    log('info', `[Twilio] Message sent to ${to} — SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', `[Twilio] Error sending message to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
```

No retry logic needed (Twilio has internal retry). Use existing log() function from logger.ts. Handle both whatsapp: prefixed and non-prefixed phone numbers.

**Test Strategy:**

Write a test that calls sendTwilioWhatsApp with admin's number and a test message. Verify message is received on admin's WhatsApp. Test error cases: missing credentials (mock env vars), invalid phone number format. Verify logs are written correctly.
