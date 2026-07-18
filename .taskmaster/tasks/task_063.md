# Task ID: 63

**Title:** Update notifications.ts to send notifications via Twilio

**Status:** done

**Dependencies:** 60 ✓

**Priority:** medium

**Description:** Modify notifyAdminNewLead to send structured notifications to admin via Twilio in addition to Meta

**Details:**

Modify backend/src/services/notifications.ts:

1. Import sendTwilioWhatsApp from lib/twilio-send
2. Update notifyAdminNewLead function:

```typescript
export async function notifyAdminNewLead(telefono: string, primerMensaje: string): Promise<void> {
  const adminWa = process.env.ADMIN_WA_NUMBER;
  if (adminWa) {
    const preview = primerMensaje.slice(0, 100);
    const message = `🆕 Nuevo lead\n📱 +${telefono}\n💬 ${preview || 'Sin mensaje'}`;
    const result = await sendWhatsAppMessage(adminWa, message);
    if (!result.success) {
      log('error', `[Notifications] Error notificando nuevo lead via Meta: ${result.error}`);
    }
  }

  // Also notify via Twilio
  const adminTwilio = process.env.ADMIN_TWILIO_WHATSAPP;
  if (adminTwilio) {
    const preview = primerMensaje.slice(0, 80);
    const twilioMsg = `🆕 Nuevo lead\n📱 [+${telefono}]\n💬 "${preview}"\n\nPara responder manualmente envía:\n[+${telefono}] Tu respuesta aquí`;
    const result = await sendTwilioWhatsApp(adminTwilio, twilioMsg);
    if (!result.success) {
      log('error', `[Notifications] Error notificando nuevo lead via Twilio: ${result.error}`);
    }
  }
}
```

Keep Meta notification as primary channel, add Twilio as secondary. Include reply format instructions in Twilio message.

**Test Strategy:**

Trigger new lead creation (send message from new number to bot). Verify admin receives notification via both Meta and Twilio. Verify Twilio message includes proper formatting with [+502XXXXXXXX] bracket format and instructions.
