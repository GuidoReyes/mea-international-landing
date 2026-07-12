# Task ID: 8

**Title:** Implement WhatsApp Message Sending Function

**Status:** done

**Dependencies:** 7 ✓

**Priority:** high

**Description:** Create utility function to send text messages via Meta WhatsApp Cloud API using the WhatsApp Business API credentials.

**Details:**

Create `src/lib/whatsapp-send.ts`. Implement async function sendWhatsAppMessage(to: string, message: string): use fetch or axios to POST to https://graph.facebook.com/v21.0/{META_PHONE_ID}/messages with headers (Authorization: Bearer {META_WHATSAPP_TOKEN}, Content-Type: application/json), body {messaging_product: 'whatsapp', to: to, type: 'text', text: {body: message}}. Handle API errors (rate limits, invalid recipient, token issues). Return success boolean and message_id. Add retry logic (max 3 attempts with exponential backoff). Log all sends for debugging.

**Test Strategy:**

Test sendWhatsAppMessage with valid phone number. Verify message is received on WhatsApp. Test with invalid number (should handle error gracefully). Test rate limiting scenario. Verify Railway logs show successful sends and any errors.
