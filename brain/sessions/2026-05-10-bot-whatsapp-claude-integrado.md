---
type: session
area: operaciones
date: 2026-05-10
slug: bot-whatsapp-claude-integrado
title: "Bot WhatsApp + Claude AI integrados y desplegados en Railway"
tags: [whatsapp, claude, redis, notion, webhook, meta, railway, backend, debug, persistencia, rate-limit, hmac]
status: active
related:
  - 2026-05-08-backend-railway-desplegado
  - 2026-05-06-notion-mcp-activo-query-verificado
sources:
  - repo:backend/src/lib/claude.ts
  - repo:backend/src/lib/redis.ts
  - repo:backend/src/lib/persistence.ts
  - repo:backend/src/lib/whatsapp-send.ts
  - repo:backend/src/lib/notion-context.ts
  - repo:backend/src/routes/whatsapp.webhook.ts
  - repo:backend/src/middleware/hmac.middleware.ts
  - repo:backend/src/middleware/rate-limit.middleware.ts
  - repo:backend/src/routes/cursos.ts
  - repo:backend/src/routes/leads.ts
superseded_by: null
---

# Bot WhatsApp + Claude AI integrados y desplegados en Railway

## Contexto

Continuación directa de la sesión de despliegue inicial. Se implementaron las Tasks 4-12 del PRD: Redis como store de historial de conversaciones, rutas CRUD para Cursos y Leads, webhook de Meta WhatsApp con verificación HMAC, envío de mensajes vía WhatsApp Cloud API, RAG desde Notion, agente Claude con memoria, persistencia en MySQL, e integración end-to-end. Finalizó con pruebas reales de comunicación WhatsApp al número de prueba de Meta, donde el bot responde correctamente vía Claude pero el envío falla con `(#133010) Account not registered`.

## Decisiones

- **Redis con guard `isReady` antes de toda operación**: el cliente ioredis/redis v4 puede recibir requests antes de conectarse; sin el guard las requests cuelgan indefinidamente. Aplicado en `getJSON`, `setJSON`, `setWithTTL`.
- **`CHAT_HISTORY_TTL=86400` (24h) y `COURSE_CACHE_TTL=3600` (1h)**: el historial de chat se mantiene un día para continuidad de conversación; el cache de cursos se invalida cada hora y en cada mutación.
- **Historial de Claude truncado a los últimos 10 mensajes**: previene tokens excesivos mientras mantiene contexto conversacional suficiente.
- **WEB_CONTEXT hardcodeado + Notion RAG opcional**: los precios y descripción principal van en el system prompt siempre (rápido, no depende de Notion). El contexto Notion se inyecta adicionalmente si la query lo merece — con cache Redis de 1h para evitar llamadas repetidas.
- **Precios MEA extraídos directamente de Notion/web**: Pre-A Q300/mes, B1-B2 Q250/mes (el más popular), VIP Q1,600/mes, Inscripción Q100, Plataforma Q130.
- **`TransactionClient` type alias para resolver TS7006**: TypeScript 6 strict mode no acepta `tx: any` implícito en callbacks de `$transaction`. Se define `type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">`.
- **Webhook siempre responde 200 antes de procesar**: Meta requiere respuesta en <20s o reenvía el mensaje. Se hace `res.status(200).send("OK")` antes de iniciar cualquier operación async.
- **Rate limiter in-memory con Map**: 10 mensajes/min por número. Retorna 200 cuando supera el límite (Meta requiere 200 siempre). Limpieza automática de entradas expiradas cada 5 minutos.
- **HMAC con `timingSafeEqual`**: verificación constante en tiempo para prevenir timing attacks. El raw body se captura en `express.json({ verify: ... })` antes de parsear JSON.
- **3 reintentos con backoff exponencial en whatsapp-send**: red puede fallar transitoriamente. Sin retry en 400/401/404 (errores de configuración, reintentar no ayuda).
- **`/api/test-bot` solo en desarrollo o con `ENABLE_TEST_ENDPOINT=true`**: endpoint temporal para pruebas manuales sin webhook real. Se eliminará cuando WhatsApp funcione end-to-end.
- **Importaciones estáticas en lugar de `import()` dinámico**: TypeScript node16 module resolution tiene problemas con dynamic import dentro de ciertas rutas. Migrado a static imports en `cursos.ts`.

## Output

- `backend/src/lib/redis.ts` — cliente Redis v4, helpers `getJSON/setJSON/setWithTTL`, guard `isReady`, TTLs definidos como constantes exportadas
- `backend/src/lib/claude.ts` — `responderMensaje(telefono, mensaje)`: historial Redis → Notion RAG → Claude API → guardar historial. WEB_CONTEXT con precios reales MEA.
- `backend/src/lib/notion-context.ts` — `getNotionContext(mensaje)`: fetcha página Notion de precios (ID `35d83de9-b32b-8001-bec4-edb3e3e4665c`), cachea en Redis 1h, retorna texto plano
- `backend/src/lib/persistence.ts` — `guardarMensajes()`: upsert lead, upsert conversacion activa, createMany de ambos mensajes en una sola transacción Prisma
- `backend/src/lib/whatsapp-send.ts` — `sendWhatsAppMessage(to, body)`: POST a Meta Graph API, 3 reintentos exponenciales, retorna `{ success, messageId?, error? }`
- `backend/src/middleware/hmac.middleware.ts` — `verifyMetaHmac`: HMAC-SHA256 sobre rawBody con `META_APP_SECRET`, comparación con `timingSafeEqual`
- `backend/src/middleware/rate-limit.middleware.ts` — `rateLimitWhatsApp`: 10 msg/min por número, Map en memoria, cleanup cada 5min
- `backend/src/routes/cursos.ts` — CRUD completo con cache Redis, `invalidateCache()` en mutaciones, `req.params["id"] as string` para TS6
- `backend/src/routes/leads.ts` — GET paginado+filtrado, GET/:id con conversaciones anidadas, PATCH/:id con validación de estado
- `backend/src/routes/whatsapp.webhook.ts` — GET (verificación Meta), POST: rate limit → HMAC → 200 inmediato → Claude → persist → send
- `backend/src/types/express.d.ts` — extiende `Express.Request` con `rawBody?: string`
- `backend/src/index.ts` — `express.json` con captura de rawBody, todos los routers montados, endpoint `/api/test-bot` condicional
- Task 22 creada: conseguir credenciales Meta (META_PHONE_ID, META_ACCESS_TOKEN, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN)
- Redis añadido como servicio en Railway con REDIS_URL configurada
- Webhook de Meta verificado (checkmark verde en Meta API Setup)
- Bot responde correctamente con Claude (respuestas en español con precios MEA reales)

## Pendiente

- [ ] Corregir `(#133010) Account not registered` — verificar que `META_PHONE_ID` en Railway coincide exactamente con el Phone Number ID del panel Meta for Developers → API Setup → Phone number ID (no el número de teléfono en sí)
- [ ] Agregar `NOTION_TOKEN` a Railway (ver variable en Railway → Variables)
- [ ] Eliminar `/api/test-bot` y `ENABLE_TEST_ENDPOINT` una vez que WhatsApp funcione end-to-end
- [ ] Task 13: Cloudflare DNS + CDN + WAF
- [ ] Task 14: JWT Auth para admin panel
- [ ] Task 15: Panel admin Next.js
- [ ] Task 16: CI/CD y variables de entorno
- [ ] Task 17: Testing end-to-end
- [ ] USER-TEST-1, USER-TEST-2, USER-TEST-3 checkpoints

## Cross-refs

- [[2026-05-08-backend-railway-desplegado]] — sesión previa que dejó Tasks 4-12 pendientes; esta sesión las implementa todas
- [[2026-05-06-notion-mcp-activo-query-verificado]] — Notion MCP activo que se usa en esta sesión para RAG de contexto de precios
- [[2026-05-13-admin-rediseniado-saas-planificado]] — sesión siguiente: las 22 tareas originales completas aquí; luego se agrega roadmap SaaS de 32 tareas

## Fuentes

- `repo:backend/src/lib/claude.ts`
- `repo:backend/src/lib/redis.ts`
- `repo:backend/src/lib/persistence.ts`
- `repo:backend/src/lib/whatsapp-send.ts`
- `repo:backend/src/lib/notion-context.ts`
- `repo:backend/src/routes/whatsapp.webhook.ts`
- `repo:backend/src/middleware/hmac.middleware.ts`
- `repo:backend/src/middleware/rate-limit.middleware.ts`
