# Task ID: 52

**Title:** Implement multi-agent AI router based on CRM stage

**Status:** done

**Dependencies:** 33 ✓

**Priority:** high

**Description:** Create agent selection system that uses different Claude prompts per lead funnel stage

**Details:**

Create backend/src/agents/agentRouter.ts. Define interface AgentConfig {systemPrompt: string, maxTokens: number, temperature: number}. Function selectAgent(lead: Lead): AgentConfig. Query lead.etapa.nombre. Switch on etapa: 'Nuevo'→bienvenida agent (capta nombre, interés, presupuesto, tono amigable, open questions, maxTokens 300, temp 0.8), 'Interesado'→calificación agent (detecta urgencia, budget, menciona modalidades/precios, temp 0.7), 'Propuesta'→cierre agent (supera objeciones, CTA agenda llamada, temp 0.6), default→general agent (current behavior). Update backend/src/lib/claude.ts: in responderMensaje(), query Lead with include etapa by telefono before calling Anthropic. Pass selectAgent(lead).systemPrompt to messages. Implement logic: if lead.creadoEn > 30 days ago AND no messages in last 30 days, use full bienvenida. If last message between 1h-30d, use agent with lead.nombre. If <1h, normal response.

**Test Strategy:**

Create leads in different stages, send messages, verify different agent responses (tone, content). Test 30-day inactive lead gets full bienvenida. Check lead in Propuesta stage gets sales-focused response.

## Subtasks

### 52.1. Create agentRouter.ts with AgentConfig interface and stage-based prompts

**Status:** pending  
**Dependencies:** None  

Create backend/src/agents/agentRouter.ts module with TypeScript interface for agent configurations and define system prompts for each CRM stage

**Details:**

Create file backend/src/agents/agentRouter.ts. Define interface AgentConfig with fields: systemPrompt (string), maxTokens (number), temperature (number). Create constant object AGENT_CONFIGS with keys matching CRM stage names ('Nuevo', 'Interesado', 'Propuesta', 'default'). For 'Nuevo' stage: systemPrompt should focus on friendly welcome, capturing nombre/interés/presupuesto with open questions, maxTokens: 300, temperature: 0.8. For 'Interesado': focus on qualification (urgency, budget), mention modalidades/precios, maxTokens: 400, temperature: 0.7. For 'Propuesta': sales-focused to overcome objections with strong CTA for scheduling call, maxTokens: 400, temperature: 0.6. For 'default': use current general behavior from claude.ts. Include WEB_CONTEXT constant imported from claude.ts or duplicated. Each systemPrompt should instruct Claude on tone, objectives, and information to gather specific to that funnel stage.

### 52.2. Implement selectAgent function with lead stage logic and time-based rules

**Status:** pending  
**Dependencies:** 52.1  

Add selectAgent function to agentRouter.ts that queries lead CRM stage and applies time-based reactivation logic to return appropriate AgentConfig

**Details:**

In backend/src/agents/agentRouter.ts, implement async function selectAgent(lead: Lead & { etapa: { nombre: string } | null, mensajes?: { creadoEn: Date }[] }): Promise<AgentConfig>. Logic: (1) If lead.creadoEn is more than 30 days ago AND last message is more than 30 days ago (or no messages), return 'Nuevo' agent (full re-engagement). (2) If last message was between 1 hour and 30 days ago, use lead.etapa?.nombre to select agent but personalize with lead.nombre if available. (3) If last message was within 1 hour, use standard stage-based selection. (4) Switch on lead.etapa?.nombre: 'Nuevo' → return AGENT_CONFIGS.Nuevo, 'Interesado' → return AGENT_CONFIGS.Interesado, 'Propuesta' → return AGENT_CONFIGS.Propuesta, default → return AGENT_CONFIGS.default. Add helper function to calculate time since last message. Export selectAgent as named export.

### 52.3. Update responderMensaje in claude.ts to query Lead with etapa relation

**Status:** pending  
**Dependencies:** 52.2  

Modify backend/src/lib/claude.ts responderMensaje function to fetch Lead with etapa and mensajes relations, then use selectAgent to determine system prompt

**Details:**

In backend/src/lib/claude.ts, update responderMensaje function signature (no change needed). Before calling Anthropic API: (1) Import selectAgent from '../agents/agentRouter'. (2) Add Prisma query to fetch lead: const lead = await prisma.lead.findUnique({ where: { telefono }, include: { etapa: { select: { nombre: true } }, conversaciones: { include: { mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 } } } } }). (3) If lead not found, use default agent. (4) Call const agentConfig = await selectAgent(lead). (5) Replace hardcoded systemPrompt with agentConfig.systemPrompt (keep WEB_CONTEXT and notionCtx concatenation logic). (6) Replace hardcoded max_tokens: 500 with agentConfig.maxTokens. (7) Add temperature parameter to client.messages.create call using agentConfig.temperature. (8) Ensure existing history and response logic remains unchanged. Import prisma client at top of file.

### 52.4. Add prisma import and test agent router integration end-to-end

**Status:** pending  
**Dependencies:** 52.3  

Ensure Prisma client is properly imported in claude.ts, create integration test for full WhatsApp message flow with different lead stages

**Details:**

In backend/src/lib/claude.ts, verify import prisma from './prisma' is added at top of file. Create test file backend/src/agents/agentRouter.test.ts (or use manual testing approach). Test scenarios: (1) Create lead in 'Nuevo' stage via Prisma, send WhatsApp message, verify response uses friendly tone with open questions. (2) Update lead to 'Interesado' stage, send message, verify response mentions pricing/modalities. (3) Update lead to 'Propuesta' stage, send message, verify response has strong CTA and objection handling. (4) Create lead with no etapa (null), verify default behavior. (5) Create old lead (31+ days), verify gets re-engagement Nuevo agent. Test by sending actual webhook payloads to /api/whatsapp/webhook or by calling responderMensaje directly. Verify logs show correct agent selection and API parameters (maxTokens, temperature).
