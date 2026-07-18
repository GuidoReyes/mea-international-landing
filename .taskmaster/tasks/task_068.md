# Task ID: 68

**Title:** End-to-end testing of complete Twilio integration flow

**Status:** done

**Dependencies:** 63 ✓, 64 ✓, 65 ✓, 67 ✓

**Priority:** high

**Description:** Comprehensive testing of bidirectional communication flow between admin, Twilio, backend, and Meta

**Details:**

Execute complete workflow testing:

Test 1: New lead notification
- Send message from new number to bot (50256311728)
- Verify admin receives notification via both Meta and Twilio
- Verify Twilio message includes proper [+502XXXXXXXX] format

Test 2: Real-time monitoring
- Send message from existing client to bot
- Verify client receives bot response
- Verify admin receives forwarding via Twilio with client message + bot response

Test 3: Admin manual response
- Admin replies via Twilio: '[+502XXXXXXXX] Hola, te llamo en 5 minutos'
- Verify client receives admin's message via Meta
- Verify modoHumano activated for that client
- Verify message saved to DB with rol='asesor'
- Verify subsequent bot messages to that client are silenced

Test 4: Bot reactivation
- Admin sends to Twilio: '/bot [+502XXXXXXXX]'
- Verify modoHumano deactivated
- Send message from client, verify bot responds

Test 5: Escalation
- Trigger escalation from Claude (test with appropriate prompt)
- Verify admin receives escalation via both Meta and Twilio
- Verify Twilio includes both reply and reactivation formats

Test 6: Error handling
- Test invalid format → verify admin receives help message
- Test missing credentials → verify graceful degradation (logs error, doesn't crash)
- Test Twilio send failure → verify main flow continues

Document all results using task-master update-subtask with findings.

**Test Strategy:**

Create test checklist with all 6 test scenarios above. Execute each scenario systematically. Record timestamps, message IDs, and screenshots. Verify Railway logs show correct flow. Check Prisma Studio to verify DB entries. Document any failures or unexpected behavior. Success criteria: all 6 scenarios pass without errors.

## Subtasks

### 68.1. Test new lead notification flow via Twilio

**Status:** pending  
**Dependencies:** None  

Verify admin receives properly formatted notification via Twilio when a new lead sends first message to bot number 50256311728

**Details:**

Steps:
1. Use a fresh phone number that has NEVER contacted 50256311728 before
2. Send test message: "Hola, quiero información sobre sus cursos"
3. Verify admin receives WhatsApp message via Twilio number with format:
   🆕 Nuevo lead
   📱 [+502XXXXXXXX]
   💬 "Hola, quiero información..."
   Para responder manualmente envía:
   [+502XXXXXXXX] Tu respuesta aquí
4. Verify message includes correct phone in bracket format [+502XXXXXXXX]
5. Check Railway logs confirm sendTwilioWhatsApp() called successfully
6. Verify admin ALSO receives notification via Meta API (existing flow)
7. Document Twilio message SID from logs using task-master update-subtask

### 68.2. Test real-time conversation monitoring forwarding

**Status:** pending  
**Dependencies:** 68.1  

Verify admin receives real-time message forwarding via Twilio showing both client message and bot response for existing conversations

**Details:**

Steps:
1. Use existing lead number (from Test 1 or any existing lead)
2. Send message to bot: "¿Cuánto cuesta el curso de programación?"
3. Wait for bot to respond to client
4. Verify admin receives forwarding via Twilio with format:
   📩 Mensaje entrante
   📱 [+502XXXXXXXX]
   👤 "¿Cuánto cuesta..."
   🤖 "[bot response text]"
5. Check Railway logs show forwarding triggered after bot response
6. Verify forwarding is fire-and-forget (doesn't block main flow if fails)
7. Send follow-up message, verify admin receives another forwarding
8. Document timestamps and verify <5s delay using task-master update-subtask

### 68.3. Test admin manual response activates modoHumano

**Status:** pending  
**Dependencies:** 68.2  

Verify admin can manually respond to client via Twilio using bracket format, message reaches client via Meta, and modoHumano is activated

**Details:**

Steps:
1. Admin replies to Twilio number: "[+502XXXXXXXX] Hola, te llamo en 5 minutos para resolver tus dudas"
2. Verify Twilio webhook receives request at /api/twilio/webhook
3. Check Railway logs show successful parsing of bracket format
4. Verify client receives admin's message via Meta API (50256311728)
5. Send message from client to bot - verify bot DOES NOT respond (silenced)
6. Check Redis: key handoff:502XXXXXXXX exists with TTL ~3600s
7. Query MySQL MensajeWhatsApp table: verify message saved with rol='asesor'
8. Test invalid format: admin sends "Hola sin formato" - verify admin receives help message
9. Document DB entry ID and Redis TTL using task-master update-subtask

### 68.4. Test bot reactivation command from admin

**Status:** pending  
**Dependencies:** 68.3  

Verify admin can reactivate bot for specific client using /bot command via Twilio, clearing modoHumano state

**Details:**

Steps:
1. Verify client is in modoHumano from Test 3 (Redis key exists)
2. Admin sends to Twilio: "/bot [+502XXXXXXXX]"
3. Verify Twilio webhook parses command correctly
4. Check Railway logs show desactivarModoHumano() called
5. Verify Redis key handoff:502XXXXXXXX is deleted
6. Admin should receive confirmation via Twilio: "Bot reactivado para [+502XXXXXXXX]"
7. Send message from client to bot - verify bot RESPONDS normally
8. Verify bot response appears in conversation history
9. Test without phone number: admin sends "/bot" alone - verify error handling
10. Document Redis state before/after using task-master update-subtask

### 68.5. Test Claude escalation triggers Twilio notification

**Status:** pending  
**Dependencies:** 68.4  

Verify Claude escalation action sends formatted notification to admin via Twilio with both response and reactivation instructions

**Details:**

Steps:
1. Reactivate bot for test client (ensure modoHumano=false)
2. Send message designed to trigger escalation: "Necesito hablar urgente con un humano sobre un problema con mi pago"
3. Check Railway logs for: Claude returned JSON {"accion":"escalar_humano","motivo":"..."}
4. Verify client receives escalation message: "Un momento, voy a conectarte con uno de nuestros asesores..."
5. Verify admin receives escalation via Twilio with format:
   🔔 Escalación requerida
   📱 [+502XXXXXXXX]
   💬 Motivo: [motivo]
   Para responder: [+502XXXXXXXX] Tu respuesta
   Para reactivar bot: /bot [+502XXXXXXXX]
6. Verify Redis handoff key created (modoHumano=true)
7. Verify admin ALSO receives Meta notification (existing fallback)
8. Test error handling: temporarily break Twilio (invalid auth token) - verify Meta fallback works and no crash
9. Document escalation motivo and message IDs using task-master update-subtask
