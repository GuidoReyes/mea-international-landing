# Task ID: 11

**Title:** Implement Lead and Conversation Persistence Logic

**Status:** done

**Dependencies:** 3 ✓

**Priority:** high

**Description:** Create function to upsert leads and persist WhatsApp conversation messages to MySQL when processing each message.

**Details:**

Create `src/lib/persistence.ts`. Implement async function guardarMensajes(telefono: string, userMessage: string, assistantResponse: string). 1) Upsert Lead: use Prisma upsert with where: {telefono}, create: {telefono}, update: {actualizadoEn: new Date()}. Get lead.id. 2) Find or create ConversacionWhatsApp: findFirst with where: {telefono, estado: 'activo'}, if not found create with {leadId, telefono, estado: 'activo'}. Get conversacion.id. 3) Create two MensajeWhatsApp records: first with {conversacionId, rol: 'user', contenido: userMessage}, second with {conversacionId, rol: 'assistant', contenido: assistantResponse}. Wrap in Prisma transaction for atomicity. Handle errors (log and don't throw - persistence failure shouldn't break bot response). Optionally extract nombre from first message if user introduces themselves.

**Test Strategy:**

Call guardarMensajes with test phone and messages. Verify Lead is created with telefono. Verify ConversacionWhatsApp is created linked to lead. Verify both user and assistant messages are saved. Test second call with same number - should reuse same Lead and Conversacion. Query database directly to confirm data integrity.
