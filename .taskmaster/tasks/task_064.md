# Task ID: 64

**Title:** Update claude.ts escalation to notify via Twilio

**Status:** done

**Dependencies:** 60 ✓

**Priority:** medium

**Description:** Modify escalation logic in claude.ts to send escalation notifications via Twilio with reply format

**Details:**

Modify backend/src/lib/claude.ts around line 99:

1. Import sendTwilioWhatsApp from './twilio-send'
2. Update escalation notification logic:

```typescript
if (parsed.accion === 'escalar_humano') {
  await activarModoHumano(telefono);
  log('info', `[Claude] Escalación a humano — motivo: ${parsed.motivo ?? 'sin motivo'}`);

  // Notify via Meta (existing)
  const asesorPhone = process.env.MIRCE_PERSONAL_PHONE;
  if (asesorPhone) {
    const mask = `XXX-${telefono.slice(-4)}`;
    sendWhatsAppMessage(
      asesorPhone,
      `🔔 Escalación requerida\n📱 +${telefono}\n💬 Motivo: ${parsed.motivo ?? 'sin motivo'}\n\nResponde directamente a este número. Envía /bot al bot para reactivarlo cuando termines.`
    ).catch((err) => log('error', `[Claude] Error notificando escalación via Meta: ${mask}`, err));
  }

  // Also notify via Twilio
  const adminTwilio = process.env.ADMIN_TWILIO_WHATSAPP;
  if (adminTwilio) {
    sendTwilioWhatsApp(
      adminTwilio,
      `🔔 Escalación requerida\n📱 [+${telefono}]\n💬 Motivo: ${parsed.motivo ?? 'sin motivo'}\n\nPara responder: [+${telefono}] Tu respuesta\nPara reactivar bot: /bot [+${telefono}]`
    ).catch((err) => log('error', `[Claude] Error notificando escalación via Twilio`, err));
  }

  const userMsg = 'Un momento, voy a conectarte con uno de nuestros asesores. 🙏 Te contactarán pronto por este mismo chat.';
  history.push({ role: 'assistant', content: userMsg });
  await saveHistory(telefono, history);
  return userMsg;
}
```

Keep Meta as fallback, add Twilio with proper command format.

**Test Strategy:**

Trigger escalation by having Claude respond with escalation JSON. Verify admin receives escalation via both Meta and Twilio. Verify Twilio message includes proper [+502XXXXXXXX] format and both response and reactivation command formats.
