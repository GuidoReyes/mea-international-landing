---
type: session
area: operaciones
date: 2026-05-19
slug: bot-notificaciones-asesor-implementadas
title: "Notificaciones proactivas al asesor, fixes Notion RAG y comportamiento del bot"
tags: [whatsapp, bot, claude, notion, rag, advisor-notify, meta-api, twilio, webhook, agentRouter, bugfix, escalacion]
status: active
related:
  - 2026-05-10-bot-whatsapp-claude-integrado
  - 2026-05-17-admin-panel-metricas-reportes-csv
  - 2026-05-14-crm-fase1-backend-frontend-implementado
sources:
  - repo:backend/src/lib/advisor-notify.ts
  - repo:backend/src/lib/claude.ts
  - repo:backend/src/agents/agentRouter.ts
  - repo:backend/src/routes/whatsapp.webhook.ts
  - repo:backend/src/lib/notion-context.ts
superseded_by: null
---

# Notificaciones proactivas al asesor, fixes Notion RAG y comportamiento del bot

## Contexto

Continuación del trabajo de integración del bot WhatsApp + Claude. El bot estaba respondiendo con el número de teléfono de MEA en sus respuestas (creando un loop: el cliente llamaba al mismo número que usa el bot), y no notificaba al asesor cuando un cliente mostraba intención de agendar clase de prueba, enviar comprobante o hablar con alguien. Además se detectaron dos bugs críticos: el inject de Notion KB estaba roto (el anchor del `.replace()` apuntaba a texto que ya no existía en el system prompt), y el webhook enviaba mensajes vacíos a Meta cuando el bot estaba en modo humano, causando errores 400 silenciosos que hacían que el bot pareciera no responder.

## Decisiones

- **Notificaciones proactivas por intención, no por escalación**: se creó `advisor-notify.ts` que detecta 4 intents en el mensaje del usuario (`clase_prueba`, `comprobante_pago`, `hablar_asesor`, `listo_inscribirse`) y notifica al asesor (MIRCE_PERSONAL_PHONE) con un mensaje contextualizado que incluye el número del cliente y preview del mensaje. Fire-and-forget, no bloquea la respuesta al cliente.
- **Bot nunca pide WhatsApp al cliente**: el cliente ya está escribiendo por WhatsApp — pedirle el número es redundante y genera fricción. Se agregó instrucción explícita en ESCALATION_INSTRUCTION: "Nunca le pidas al cliente su número de WhatsApp... Si quiere agendar algo, respondé: 'El equipo se pondrá en contacto pronto por este mismo chat'".
- **Número de teléfono removido del WEB_CONTEXT**: quitado `CONTACTO: WhatsApp +502 5631-1728` para que el bot nunca cite el número en respuestas. El asesor tiene el número del cliente desde el webhook.
- **Meta API 24h window es el bloqueador de notificaciones**: la API de WhatsApp Business solo permite enviar texto libre a un número si ese número escribió en las últimas 24h. Solución inmediata: Mirce envía "hola" al número del bot desde su personal. Solución permanente: template aprobado por Meta (`aviso_asesor`) o canal Twilio.
- **Canal Twilio para bracket-reply**: el webhook Twilio ya implementado (`twilio.webhook.ts`) permite responder con formato `[+502XXXXXXXX] mensaje` y silencia el bot automáticamente. Requiere configurar 4 vars de entorno en Railway. Mirce deberá hacer `join [keyword]` al sandbox Twilio desde su personal.
- **Anchor del Notion inject**: el `.replace()` en `claude.ts` buscaba `"\n\nIMPORTANTE: Si el cliente pregunta"` — texto que dejó de existir cuando se modificó `ESCALATION_INSTRUCTION`. Corregido para buscar `"\n\nIMPORTANTE: Nunca menciones"` (el nuevo prefijo).

## Output

- `backend/src/lib/advisor-notify.ts` — **nuevo archivo**: `detectIntent(mensaje)` con 4 regexes, `notifyAdvisorIfNeeded(telefono, mensaje, intent)` que envía al asesor vía Meta y/o Twilio con mensaje contextualizado
- `backend/src/lib/claude.ts` — importa `advisor-notify`, llama `notifyAdvisorIfNeeded` fire-and-forget antes de llamar a Claude; anchor del `.replace()` de Notion corregido
- `backend/src/agents/agentRouter.ts` — removido número de teléfono de WEB_CONTEXT; ESCALATION_INSTRUCTION expandida con instrucción de no pedir WhatsApp y no mencionar teléfonos
- `backend/src/routes/whatsapp.webhook.ts` — guard `if (respuesta)` antes de `sendWhatsAppMessage` para no enviar mensajes vacíos en modo humano
- `backend/src/lib/notion-context.ts` — page ID corregido (`36183de9-b32b-8064-9456-c0d9ce8e942c`), límite aumentado a 5000 chars, cache key por mensaje
- Commits pusheados: `67123cb`, `bac033a`, `5e76e89`, `33c3f3a`

## Pendiente

- [ ] Configurar Twilio en Railway para activar bracket-reply: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `ADMIN_TWILIO_WHATSAPP=+50250191753` — Mirce hace `join [keyword]` al sandbox
- [ ] Crear template Meta `aviso_asesor` (categoría Utility, cuerpo `{{1}}`) para notificaciones sin depender de ventana 24h
- [ ] Mirce envía mensaje diario al bot (`+502 5631-1728`) para mantener ventana 24h abierta mientras no hay Twilio
- [ ] Verificar que notificaciones llegan correctamente una vez abierta la ventana
- [ ] Notion page `36183de9-b32b-8064-9456-c0d9ce8e942c` debe estar compartida con la integración de Notion en el workspace

## Cross-refs

- [[2026-05-10-bot-whatsapp-claude-integrado]] — archivos core del bot (`claude.ts`, `whatsapp.webhook.ts`, `notion-context.ts`) creados en esa sesión y modificados aquí
- [[2026-05-17-admin-panel-metricas-reportes-csv]] — Twilio Sandbox fue descartado para monitoreo admin en esa sesión; aquí se evalúa activar Twilio para canal de notificaciones al asesor
- [[2026-05-14-crm-fase1-backend-frontend-implementado]] — `agentRouter.ts` con multi-etapa creado allí; aquí se modifica ESCALATION_INSTRUCTION y WEB_CONTEXT
- [[2026-05-21-security-backup-agente-implementado]] — esta misma sesión también inició el agente de seguridad + backup (tasks 71-76); el PRD fue parseado antes del compact

## Fuentes

- `repo:backend/src/lib/advisor-notify.ts`
- `repo:backend/src/lib/claude.ts`
- `repo:backend/src/agents/agentRouter.ts`
- `repo:backend/src/routes/whatsapp.webhook.ts`
- `repo:backend/src/lib/notion-context.ts`
- `repo:backend/src/routes/twilio.webhook.ts`
