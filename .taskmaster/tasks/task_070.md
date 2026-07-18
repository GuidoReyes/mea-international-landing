# Task ID: 70

**Title:** Implement proactive advisor notification system for high-intent user actions

**Status:** pending

**Dependencies:** 69 ✓, 65 ✓

**Priority:** medium

**Description:** Build an intent detection system that identifies when users want to schedule a trial class, send payment proof, speak with an advisor, or are ready to enroll, and automatically notifies the advisor via Twilio with contextualized alerts without interrupting bot conversation flow.

**Details:**

**Architecture Overview:**

This feature adds a parallel notification layer that runs AFTER the bot generates a response but BEFORE sending it to the user. Unlike escalation (Task 55), which transfers control to a human, this system sends proactive "heads up" notifications to the advisor while the bot continues handling the conversation.

**Implementation Steps:**

1. **Create intent detection utility** (`backend/src/lib/intent-detector.ts`):

```typescript
export type UserIntent = 'clase_prueba' | 'comprobante_pago' | 'hablar_asesor' | 'listo_inscribirse' | null;

interface IntentResult {
  detected: boolean;
  intent: UserIntent;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect high-intent user actions from message content.
 * Uses keyword matching + Claude's response to determine intent.
 */
export function detectIntent(userMessage: string, botResponse: string): IntentResult {
  const msg = userMessage.toLowerCase();
  const resp = botResponse.toLowerCase();
  
  // Intent: clase_prueba (trial class scheduling)
  if (
    msg.includes('clase de prueba') || 
    msg.includes('clase prueba') || 
    msg.includes('probar') || 
    msg.includes('demo') ||
    (msg.includes('clase') && (msg.includes('gratis') || msg.includes('primera')))
  ) {
    return { detected: true, intent: 'clase_prueba', confidence: 'high' };
  }
  
  // Intent: comprobante_pago (payment proof upload)
  if (
    msg.includes('comprobante') || 
    msg.includes('pagué') || 
    msg.includes('pague') ||
    msg.includes('transferencia') || 
    msg.includes('deposité') ||
    msg.includes('adjunto') ||
    msg.includes('envío el pago') ||
    (msg.includes('ya') && msg.includes('pag'))
  ) {
    return { detected: true, intent: 'comprobante_pago', confidence: 'high' };
  }
  
  // Intent: hablar_asesor (wants to speak with human advisor)
  if (
    msg.includes('hablar con') || 
    msg.includes('comunicar') || 
    msg.includes('asesor') ||
    msg.includes('alguien') || 
    msg.includes('persona') ||
    msg.includes('llamar') ||
    msg.includes('contacto')
  ) {
    return { detected: true, intent: 'hablar_asesor', confidence: 'high' };
  }
  
  // Intent: listo_inscribirse (ready to enroll)
  if (
    msg.includes('inscrib') || 
    msg.includes('quiero empezar') || 
    msg.includes('listo para') ||
    msg.includes('me anoto') || 
    msg.includes('como me inscribo') ||
    (msg.includes('si') && (msg.includes('inscri') || msg.includes('empez'))) ||
    resp.includes('inscripción') || 
    resp.includes('bienvenid')
  ) {
    return { detected: true, intent: 'listo_inscribirse', confidence: 'high' };
  }
  
  return { detected: false, intent: null, confidence: 'low' };
}

/**
 * Generate contextualized advisor notification message based on detected intent.
 */
export function generateAdvisorNotification(
  telefono: string, 
  intent: UserIntent, 
  userMessage: string
): string {
  const preview = userMessage.slice(0, 100);
  
  switch (intent) {
    case 'clase_prueba':
      return `🎯 *OPORTUNIDAD: Clase de prueba*\n📱 [+${telefono}]\n💬 "${preview}"\n\n✅ Cliente interesado en agendar clase de prueba. Contactar para coordinar horario.`;
    
    case 'comprobante_pago':
      return `💰 *ACCIÓN REQUERIDA: Comprobante de pago*\n📱 [+${telefono}]\n💬 "${preview}"\n\n⚠️ Cliente dice haber enviado/va a enviar comprobante. Verificar pago y confirmar inscripción.`;
    
    case 'hablar_asesor':
      return `🙋 *SOLICITUD: Hablar con asesor*\n📱 [+${telefono}]\n💬 "${preview}"\n\n📞 Cliente solicita contacto con asesor humano. Atender consulta personalizada.`;
    
    case 'listo_inscribirse':
      return `🚀 *LEAD CALIENTE: Listo para inscribirse*\n📱 [+${telefono}]\n💬 "${preview}"\n\n🔥 Cliente muestra interés alto en inscribirse. Cerrar venta inmediatamente.`;
    
    default:
      return '';
  }
}
```

2. **Integrate intent detection in WhatsApp webhook** (`backend/src/routes/whatsapp.webhook.ts`):

Add import at top:
```typescript
import { detectIntent, generateAdvisorNotification } from '../lib/intent-detector';
```

After line 84 (after `respuesta = await responderMensaje(telefono, mensaje)`), add:

```typescript
// Proactive intent detection — notify advisor if high-intent action detected
const intentResult = detectIntent(mensaje, respuesta);
if (intentResult.detected && intentResult.intent) {
  const advisorPhone = process.env.MIRCE_PERSONAL_PHONE;
  if (advisorPhone) {
    const notification = generateAdvisorNotification(telefono, intentResult.intent, mensaje);
    sendTwilioWhatsApp(advisorPhone, notification).catch((err) =>
      log('error', `[WhatsApp] ${mask} | Error enviando notificación de intent:`, err)
    );
    log('info', `[WhatsApp] ${mask} | Intent detectado: ${intentResult.intent}`);
  }
}
```

3. **Ensure bot never mentions MEA phone number**:

Update `backend/src/agents/agentRouter.ts`:

- Remove or obfuscate the phone number in `WEB_CONTEXT` constant (line 37):
```typescript
CONTACTO: WhatsApp disponible · mea.edu.gt · Horario de atención Lunes a Sábado 8am-5pm
```

- Add to ALL agent system prompts (after WEB_CONTEXT injection):
```typescript
RESTRICCIÓN CRÍTICA: NUNCA menciones números de teléfono de MEA en tus respuestas. Si el cliente pregunta por contacto, decí "podés escribirnos por este mismo WhatsApp" o "te contactaremos pronto por aquí".
```

4. **Environment variable validation**:

Ensure `MIRCE_PERSONAL_PHONE` is configured. Add validation in `backend/src/index.ts` startup:

```typescript
if (!process.env.MIRCE_PERSONAL_PHONE) {
  log('warn', '[Config] MIRCE_PERSONAL_PHONE no configurado — notificaciones de intent deshabilitadas');
}
```

**Key Design Decisions:**

1. **No escalation**: Unlike Task 55's escalation system, this does NOT activate human mode or silence the bot. The bot continues responding normally.

2. **Fire-and-forget**: Intent notifications are sent asynchronously without blocking the main response flow (same pattern as Task 65's forwarding).

3. **Single channel**: Notifications go to `MIRCE_PERSONAL_PHONE` via Twilio only (not Meta WhatsApp) to avoid duplicate alerts.

4. **Keyword-based detection**: Uses simple keyword matching for reliability. Can be upgraded to Claude-based classification later if needed.

5. **Context-aware messages**: Each intent has a specific emoji + action label to help advisor prioritize (🎯 trial, 💰 payment, 🙋 advisor request, 🚀 ready to enroll).

**Integration with existing systems:**

- Works alongside Task 65's real-time forwarding (which sends all conversations)
- Works alongside Task 55's escalation system (which transfers control)
- Uses same Twilio infrastructure from Task 60, 63, 64
- Leverages Notion RAG context from Task 69 for accurate bot responses

**Error handling:**

- If Twilio send fails, it logs error but doesn't block main flow
- If `MIRCE_PERSONAL_PHONE` not configured, feature is silently disabled
- Intent detection always returns a result (defaults to no intent detected)

**Performance impact:**

- Intent detection adds ~1-2ms (simple string operations)
- Notification send is async, no latency impact on user
- No additional database queries required

**Test Strategy:**

**Test Plan:**

**1. Intent Detection Unit Tests:**

Create `backend/src/lib/intent-detector.test.ts`:

```typescript
import { detectIntent } from './intent-detector';

describe('Intent Detection', () => {
  test('detects clase_prueba intent', () => {
    const result = detectIntent('Hola, quiero una clase de prueba', 'Claro, podemos coordinar...');
    expect(result.detected).toBe(true);
    expect(result.intent).toBe('clase_prueba');
  });
  
  test('detects comprobante_pago intent', () => {
    const result = detectIntent('Ya pagué, te envío el comprobante', '');
    expect(result.detected).toBe(true);
    expect(result.intent).toBe('comprobante_pago');
  });
  
  test('detects hablar_asesor intent', () => {
    const result = detectIntent('Necesito hablar con un asesor', '');
    expect(result.detected).toBe(true);
    expect(result.intent).toBe('hablar_asesor');
  });
  
  test('detects listo_inscribirse intent', () => {
    const result = detectIntent('Quiero inscribirme ya', 'Perfecto, para inscribirte...');
    expect(result.detected).toBe(true);
    expect(result.intent).toBe('listo_inscribirse');
  });
  
  test('returns null for no intent detected', () => {
    const result = detectIntent('Hola, cómo estás?', 'Muy bien, gracias');
    expect(result.detected).toBe(false);
    expect(result.intent).toBe(null);
  });
});
```

Run: `npm test intent-detector.test.ts`

**2. End-to-End Intent Notification Tests:**

**Test 1: Trial class intent**
- Send message to bot: "Hola, me gustaría tomar una clase de prueba antes de inscribirme"
- Verify bot responds normally (doesn't escalate or mention phone)
- Verify advisor receives Twilio notification: "🎯 *OPORTUNIDAD: Clase de prueba*..."
- Check Railway logs: `Intent detectado: clase_prueba`

**Test 2: Payment proof intent**
- Send message: "Ya hice la transferencia, te envío el comprobante por aquí"
- Verify bot responds normally
- Verify advisor receives: "💰 *ACCIÓN REQUERIDA: Comprobante de pago*..."
- Check Railway logs: `Intent detectado: comprobante_pago`

**Test 3: Speak with advisor intent**
- Send message: "Necesito hablar con un asesor para consultar algo específico"
- Verify bot responds normally (not escalated yet)
- Verify advisor receives: "🙋 *SOLICITUD: Hablar con asesor*..."
- Check Railway logs: `Intent detectado: hablar_asesor`

**Test 4: Ready to enroll intent**
- Send message: "Listo, quiero inscribirme en el curso intermedio"
- Verify bot responds normally
- Verify advisor receives: "🚀 *LEAD CALIENTE: Listo para inscribirse*..."
- Check Railway logs: `Intent detectado: listo_inscribirse`

**Test 5: No phone number in responses**
- Send various queries about contact information
- Verify bot NEVER includes "+502 5631-1728" or any MEA phone in responses
- Expected responses: "podés escribirnos por este mismo WhatsApp", "te contactaremos por aquí"

**Test 6: Multiple intents in sequence**
- Send 3 different high-intent messages from same client
- Verify advisor receives 3 separate notifications
- Verify bot continues functioning normally (no escalation)
- Verify no duplicate or missed notifications

**Test 7: Intent + Escalation interaction**
- Send message triggering intent: "Quiero inscribirme pero tengo una duda muy específica"
- Bot responds normally + sends intent notification
- Send follow-up that triggers escalation: "Necesito hablar con alguien YA"
- Verify both intent notification AND escalation notification are sent
- Verify bot enters human mode after escalation

**Test 8: Missing MIRCE_PERSONAL_PHONE**
- Temporarily unset `MIRCE_PERSONAL_PHONE` in Railway
- Send high-intent message
- Verify bot responds normally
- Verify no crash or error blocking main flow
- Check logs: warning about notifications disabled

**Test 9: Twilio send failure**
- Temporarily misconfigure TWILIO_AUTH_TOKEN
- Send high-intent message
- Verify bot responds to user successfully (not blocked)
- Check logs: error logged but flow continues

**Test 10: Performance test**
- Send 10 messages rapidly (mix of intent and non-intent)
- Verify all bot responses arrive in < 10 seconds
- Verify intent detection doesn't add significant latency
- Check Railway metrics: no CPU or memory spikes

**Success Criteria:**
- All 10 tests pass
- Intent detection accuracy > 90% (manually test 20 sample phrases)
- No phone numbers in any bot responses (test 50+ conversations)
- Zero crashes or blocking errors even with misconfiguration
- Advisor notifications arrive within 5 seconds of message
- Bot response time remains < 10 seconds (no degradation)
