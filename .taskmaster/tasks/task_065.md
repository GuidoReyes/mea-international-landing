# Task ID: 65

**Title:** Implement real-time conversation forwarding to admin via Twilio

**Status:** done

**Dependencies:** 60 ✓

**Priority:** medium

**Description:** Add forwarding of all bot conversations to admin's Twilio WhatsApp for real-time monitoring

**Details:**

Modify backend/src/routes/whatsapp.webhook.ts:

After the bot responds successfully (after line 103), add forwarding logic:

```typescript
// After sending response to client
if (sent.success) {
  log('info', `[WhatsApp] ${mask} | Respuesta enviada — ID: ${sent.messageId}`);
  
  // Forward conversation to admin via Twilio (fire and forget)
  const adminTwilio = process.env.ADMIN_TWILIO_WHATSAPP;
  if (adminTwilio) {
    const previewMsg = mensaje.length > 60 ? mensaje.slice(0, 60) + '...' : mensaje;
    const previewResp = respuesta.length > 60 ? respuesta.slice(0, 60) + '...' : respuesta;
    const forwardMsg = `📩 Mensaje entrante\n📱 [+${telefono}]\n👤 "${previewMsg}"\n🤖 "${previewResp}"`;
    
    sendTwilioWhatsApp(adminTwilio, forwardMsg).catch((err) =>
      log('error', `[WhatsApp] ${mask} | Error forwarding to admin via Twilio:`, err)
    );
  }
} else {
  log('error', `[WhatsApp] ${mask} | Error enviando mensaje: ${sent.error}`);
}
```

Only forward if ADMIN_TWILIO_WHATSAPP is configured. Never block main flow if Twilio send fails (fire and forget). Truncate long messages to 60 chars with ellipsis.

**Test Strategy:**

Send message to bot from client. Verify client receives bot response. Verify admin receives forwarding message via Twilio with proper format showing client message and bot response. Verify main flow is not blocked if Twilio send fails (test by temporarily misconfiguring TWILIO_AUTH_TOKEN).
