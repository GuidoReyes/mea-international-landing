---
type: session
area: operaciones
date: 2026-05-08
slug: backend-railway-desplegado
title: "Backend Express+TypeScript desplegado en Railway con Prisma+MySQL"
tags: [railway, backend, express, typescript, prisma, mysql, docker, despliegue, debug, prd, taskmaster]
status: active
related:
  - 2026-04-30-infra-despliegue-wiki-notion-mcp
  - 2026-05-06-notion-mcp-activo-query-verificado
sources:
  - repo:backend/src/index.ts
  - repo:backend/prisma/schema.prisma
  - repo:Dockerfile
  - repo:railway.json
  - repo:.taskmaster/docs/prd.md
superseded_by: null
---

# Backend Express+TypeScript desplegado en Railway con Prisma+MySQL

## Contexto

Sesión de implementación y despliegue del backend de MEA International. El punto de partida era el repo con solo la landing page Next.js. Se implementó desde cero el backend API REST, se configuró Railway como plataforma de hosting, se definió el esquema de base de datos con Prisma+MySQL, y se depuraron múltiples errores de despliegue hasta tener el servicio online. Adicionalmente se generó el PRD del proyecto y se crearon las tareas en Task Master AI.

## Decisiones

- **Railway con Dockerfile en lugar de Nixpacks**: Nixpacks v1.41.0 tenía un bug (`UndefinedVar: $NIXPACKS_PATH`) que bloqueaba el build. Se migró a builder DOCKERFILE para tener control total del proceso de build.
- **node:20-slim en lugar de node:20-alpine**: Prisma requiere OpenSSL que alpine no incluye. slim (Debian-based) tiene OpenSSL y se instala con `apt-get install -y openssl`.
- **Prisma 5 en lugar de Prisma 7**: Prisma 7 requiere Node 20.19+. Railway tenía 20.18.1. Downgrade a Prisma 5 que soporta Node 18+.
- **`prisma db push` en startCommand, no en buildCommand**: Railway solo inyecta env vars en runtime. DATABASE_URL no está disponible durante el build. La migracion va en el CMD del Dockerfile.
- **`prisma db push` sobre `prisma migrate deploy` para ambiente greenfield**: no se necesitan archivos de migración para un esquema nuevo; push es más simple en etapa inicial.
- **PORT 8080 desde Railway**: Railway inyecta PORT=8080, no 4000. La app lee `process.env.PORT || 4000`. El proxy de Railway debe apuntar al puerto correcto (8080).
- **tsconfig moduleResolution "node16"**: TypeScript 6 deprecó "node". Cambiado a "node16" con `"module": "Node16"`.
- **DATABASE_URL como string literal en Railway vars**: el usuario tenía la variable con valor vacío (referencia no configurada). Se copió la connection string completa del panel MySQL de Railway.

## Output

- `backend/src/index.ts` — Express app con helmet, CORS, health check en /health, PORT desde env
- `backend/tsconfig.json` — TypeScript con Node16 module resolution
- `backend/prisma/schema.prisma` — 5 modelos: Lead (telefono @unique), Curso, ConversacionWhatsApp, MensajeWhatsApp, Admin
- `backend/src/lib/prisma.ts` — PrismaClient singleton con globalThis pattern
- `backend/package.json` — Prisma 5, Express 5, engines node>=18.0.0
- `Dockerfile` — node:20-slim, openssl, build+generate en build, db push en CMD
- `railway.json` — builder DOCKERFILE, healthcheck /health, restartPolicyType ON_FAILURE
- `.taskmaster/docs/prd.md` — PRD completo (score 98.2%, 20 tareas generadas)
- Backend live: `mea-international-landing-production.up.railway.app/health` → `{"status":"ok"}`
- 5 tablas creadas en MySQL vía `prisma db push`
- Tasks 1, 2, 3 marcadas como done en Task Master

## Pendiente

- [ ] Task 4: Agregar Redis a Railway y crear cliente de configuración
- [ ] Task 5: Rutas CRUD para Cursos
- [ ] Task 6: Rutas CRUD para Leads
- [ ] Task 7: Implementar Meta WhatsApp Webhook con HMAC
- [ ] Task 8: Función de envío de mensajes WhatsApp
- [ ] Task 9: Recuperación de contexto RAG desde Notion
- [ ] Task 10: Claude AI Agent con memoria de conversación
- [ ] Task 11: Persistencia de leads y conversaciones
- [ ] Task 12: Integrar Claude AI Agent en WhatsApp Webhook
- [ ] Task 13: Configurar Cloudflare DNS + CDN + WAF
- [ ] Task 14: Sistema JWT de autenticación
- [ ] Task 15: Panel admin en Next.js
- [ ] Task 16: CI/CD y variables de entorno
- [ ] Task 17: Testing end-to-end
- [ ] USER-TEST-1, USER-TEST-2, USER-TEST-3 checkpoints

## Cross-refs

- [[2026-04-30-infra-despliegue-wiki-notion-mcp]] — sesión que configuró Vercel y DNS; esta sesión agrega Railway como plataforma backend complementaria
- [[2026-05-06-notion-mcp-activo-query-verificado]] — misma área operaciones; Notion MCP activo que se usará en Task 9 (RAG de contexto)
- [[2026-05-10-bot-whatsapp-claude-integrado]] — sesión que implementa las Tasks 4-12 dejadas pendientes aquí; bot WhatsApp + Claude operativo
- [[2026-05-13-admin-rediseniado-saas-planificado]] — arquitectura backend de esta sesión se extiende con CRM, pagos, certificados y scheduler en el upgrade SaaS

## Fuentes

- `repo:backend/src/index.ts`
- `repo:backend/prisma/schema.prisma`
- `repo:Dockerfile`
- `repo:railway.json`
- `repo:.taskmaster/docs/prd.md`
