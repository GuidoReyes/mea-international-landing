# PRD: MEA International — Backend Completo + Agente WhatsApp con IA

**Author:** Guido Reyes
**Date:** 2026-05-07
**Status:** Approved
**Version:** 1.0
**Taskmaster Optimized:** Yes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Stories](#user-stories)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Considerations](#technical-considerations)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Out of Scope](#out-of-scope)
10. [Open Questions & Risks](#open-questions--risks)
11. [Validation Checkpoints](#validation-checkpoints)
12. [Appendix: Task Breakdown Hints](#appendix-task-breakdown-hints)

---

## Executive Summary

MEA International tiene el frontend (Next.js 16 en Vercel) funcionando, pero carece de backend, base de datos, cache y sistema de atención automatizada por WhatsApp. Este PRD define el desarrollo de un backend Express + TypeScript en Railway con MySQL + Prisma, Redis, un agente de IA sobre WhatsApp usando Claude AI con RAG (Notion + web), y CDN/WAF con Cloudflare. El resultado esperado es un sistema completo de captación y atención de leads estudiantiles con respuesta automatizada 24/7 y un pipeline CI/CD profesional.

---

## Problem Statement

### Current Situation
El frontend de MEA International existe y está desplegado en Vercel, pero no hay backend que lo soporte. No existe base de datos para gestionar leads, cursos ni conversaciones. Los potenciales alumnos no tienen canal de atención automática: las consultas por WhatsApp se responden manualmente.

### User Impact
- **Quién es afectado:** Prospectos de alumnos que consultan por cursos via WhatsApp; staff de MEA que responde manualmente.
- **Cómo los afecta:** Respuestas lentas (fuera de horario), pérdida de leads por falta de seguimiento, carga manual alta en el equipo.
- **Severidad:** Alta — impacto directo en conversión y revenue.

### Business Impact
- **Costo del problema:** Leads perdidos por falta de atención inmediata; tiempo de staff dedicado a respuestas repetitivas.
- **Oportunidad:** Atención 24/7 automatizada con IA puede multiplicar la tasa de conversión de consultas a inscripciones.
- **Importancia estratégica:** Sin backend no hay panel admin, sin panel admin no hay visibilidad sobre el negocio.

### Why Solve This Now?
El frontend ya está listo y desplegado. Es el momento natural para construir la infraestructura que lo soporte. Railway y Claude AI permiten hacerlo con velocidad y costo bajo.

---

## Goals & Success Metrics

### Goal 1: Backend API funcionando en Railway
- **Descripción:** Express + TypeScript corriendo con endpoints de leads, cursos y webhook WhatsApp.
- **Métrica:** Todos los endpoints responden < 300ms en el percentil 95.
- **Baseline:** 0 (no existe backend).
- **Target:** API con uptime > 99.5%, health check verde en Railway.
- **Timeframe:** Semana 1.
- **Medición:** Railway monitoring + logs.

### Goal 2: Agente WhatsApp respondiendo automáticamente
- **Descripción:** Bot con Claude AI que responde consultas de cursos, precios y modalidades 24/7.
- **Métrica:** Tasa de respuesta automática exitosa > 95% de los mensajes recibidos.
- **Baseline:** 0% (todo manual).
- **Target:** > 95% de mensajes respondidos en < 10 segundos.
- **Timeframe:** Semana 2.
- **Medición:** Logs de Railway + tabla MensajeWhatsApp en MySQL.

### Goal 3: Leads capturados y trackeados
- **Descripción:** Cada interacción por WhatsApp crea o actualiza un lead en MySQL.
- **Métrica:** 100% de conversaciones asociadas a un Lead en la base de datos.
- **Baseline:** 0 leads en base de datos.
- **Target:** Pipeline completo: WhatsApp → Lead → ConversacionWhatsApp → MensajeWhatsApp.
- **Timeframe:** Semana 2.
- **Medición:** Queries directos a MySQL en Railway.

### Goal 4: Dominio con CDN, WAF y DNS en Cloudflare
- **Descripción:** meainternational.com protegido con Cloudflare WAF, Bot Fight Mode, Rate Limiting.
- **Métrica:** Cloudflare activo con proxy naranja en todos los registros DNS.
- **Baseline:** Sin CDN ni WAF.
- **Target:** Score WAF configurado, 0 requests maliciosos pasando.
- **Timeframe:** Semana 3.
- **Medición:** Dashboard Cloudflare.

---

## User Stories

### Story 1: Prospecto consulta por WhatsApp
**As a** prospecto interesado en un curso de MEA,
**I want to** enviar un mensaje por WhatsApp preguntando por cursos, precios y modalidades,
**So that I can** recibir información precisa de inmediato sin esperar a que un humano responda.

**Acceptance Criteria:**
- [ ] El bot responde en español en menos de 10 segundos.
- [ ] Las respuestas están basadas en la información real de MEA (no inventada).
- [ ] El bot no inventa precios ni fechas que no estén en el contexto.
- [ ] Si el bot no sabe, indica que un asesor se pondrá en contacto.
- [ ] La conversación se guarda en MySQL (Lead + ConversacionWhatsApp + MensajeWhatsApp).
- [ ] El historial de conversación (últimos 10 mensajes) se mantiene via Redis.

**Task Breakdown Hint:**
- Task: Implementar webhook Meta con validación HMAC (~4h)
- Task: Integrar Claude AI con historial Redis (~6h)
- Task: Implementar RAG con contexto Notion (~5h)
- Task: Persistir conversaciones en MySQL via Prisma (~3h)

**Dependencies:** Railway backend, MySQL, Redis, Meta WhatsApp Business API.

---

### Story 2: Staff de MEA ve los leads generados
**As a** miembro del equipo de MEA International,
**I want to** ver los leads generados y sus conversaciones de WhatsApp,
**So that I can** hacer seguimiento comercial a los prospectos más interesados.

**Acceptance Criteria:**
- [ ] Existe un endpoint GET /api/leads que devuelve leads con paginación.
- [ ] Cada lead tiene: teléfono, nombre (si se capturó), email, interés, estado, fecha.
- [ ] El estado del lead puede ser: nuevo, contactado, inscrito.
- [ ] Las conversaciones asociadas al lead son accesibles.

**Task Breakdown Hint:**
- Task: Implementar CRUD de leads con Prisma (~5h)
- Task: Endpoint GET /api/leads con filtros y paginación (~3h)
- Task: Auth JWT para proteger endpoints admin (~4h)

**Dependencies:** MySQL, Prisma schema, JWT middleware.

---

### Story 3: Deploy automático al mergear a main
**As a** desarrollador de MEA International,
**I want to** que al hacer push a main se dispare automáticamente el deploy en Vercel y Railway,
**So that I can** mantener producción actualizada sin pasos manuales.

**Acceptance Criteria:**
- [ ] Push a main → Vercel redeploya el frontend automáticamente.
- [ ] Push a main → Railway redeploya el backend automáticamente.
- [ ] El trabajo diario se hace en ramas `sesion-YYYYMMDD`, no en main directamente.
- [ ] Un solo merge al día dispara un solo build.

**Task Breakdown Hint:**
- Task: Configurar variables de entorno en Railway (~2h)
- Task: Configurar variable NEXT_PUBLIC_API_URL en Vercel (~1h)
- Task: Documentar estrategia de branches (~1h)

**Dependencies:** GitHub repo conectado a Railway y Vercel.

---

## Functional Requirements

### Must Have (P0) — Crítico para el lanzamiento

#### REQ-001: Backend Express + TypeScript en Railway
**Descripción:** Servidor Express corriendo en Railway con estructura de carpetas definida, middlewares de seguridad (helmet, cors) y health check.

**Acceptance Criteria:**
- [ ] GET /health devuelve `{ status: "ok" }`.
- [ ] CORS configurado para aceptar solo `FRONTEND_URL` y `localhost:3000`.
- [ ] helmet activo en todas las rutas.
- [ ] Puerto configurable via variable de entorno `PORT`.

**Technical Specification:**
```typescript
// src/index.ts
const app = express();
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL!, "http://localhost:3000"] }));
app.use(express.json());
app.use("/api/meta", whatsappRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/cursos", cursosRoutes);
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(process.env.PORT || 4000);
```

**Task Breakdown:**
- Inicializar proyecto backend con npm + TypeScript: Small (2h)
- Instalar dependencias (express, helmet, cors, dotenv, prisma, redis, anthropic): Small (1h)
- Crear estructura de carpetas y src/index.ts: Small (2h)
- Configurar tsconfig.json: Small (1h)

**Dependencies:** Railway account, Node.js 20+.

---

#### REQ-002: MySQL + Prisma en Railway
**Descripción:** Base de datos MySQL provisionada en Railway con schema Prisma que incluye Lead, Curso, ConversacionWhatsApp, MensajeWhatsApp y Admin.

**Acceptance Criteria:**
- [ ] `npx prisma migrate dev --name init` corre sin errores.
- [ ] `npx prisma generate` genera el cliente correctamente.
- [ ] Los modelos Lead, Curso, ConversacionWhatsApp, MensajeWhatsApp y Admin existen en la BD.
- [ ] Lead.telefono tiene constraint UNIQUE.
- [ ] ConversacionWhatsApp tiene relación con Lead (FK opcional).

**Technical Specification:**
```prisma
model Lead {
  id            Int      @id @default(autoincrement())
  telefono      String   @unique
  nombre        String?
  email         String?
  interes       String?
  estado        String   @default("nuevo") // nuevo, contactado, inscrito
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
  conversaciones ConversacionWhatsApp[]
}

model Curso {
  id          Int      @id @default(autoincrement())
  nombre      String
  descripcion String   @db.Text
  precio      Decimal  @db.Decimal(10, 2)
  modalidad   String   // presencial, online, hibrido
  duracion    String
  activo      Boolean  @default(true)
  creadoEn    DateTime @default(now())
}

model ConversacionWhatsApp {
  id       Int               @id @default(autoincrement())
  leadId   Int?
  telefono String
  lead     Lead?             @relation(fields: [leadId], references: [id])
  mensajes MensajeWhatsApp[]
  estado   String            @default("activo") // activo, en_proceso, cerrado
  creadoEn DateTime          @default(now())
}

model MensajeWhatsApp {
  id             Int                  @id @default(autoincrement())
  conversacionId Int
  conversacion   ConversacionWhatsApp @relation(fields: [conversacionId], references: [id])
  rol            String               // user, assistant
  contenido      String               @db.Text
  creadoEn       DateTime             @default(now())
}

model Admin {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  password String
  nombre   String
  rol      String   @default("ADMIN") // SUPER_ADMIN, ADMIN
  activo   Boolean  @default(true)
  creadoEn DateTime @default(now())
}
```

**Task Breakdown:**
- Agregar MySQL en Railway (UI): Small (30min)
- Escribir prisma/schema.prisma completo: Small (2h)
- Correr prisma migrate dev + generate: Small (1h)

**Dependencies:** REQ-001, Railway MySQL addon.

---

#### REQ-003: Redis en Railway para cache y sesiones
**Descripción:** Redis provisionado en Railway. Se usa para: historial de conversación WhatsApp (TTL 24h), JWT tokens inválidos (logout), cache de cursos.

**Acceptance Criteria:**
- [ ] Redis conectado via `REDIS_URL` de Railway.
- [ ] `redis.set()` y `redis.get()` funcionan correctamente.
- [ ] Historial WhatsApp se guarda como JSON en key `chat:{telefono}` con TTL 86400 segundos.
- [ ] Cache de cursos se invalida cuando se actualiza un curso.

**Technical Specification:**
```typescript
// src/lib/redis.ts
import { createClient } from "redis";
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();
export default redis;

// Uso en agente:
const historialRaw = await redis.get(`chat:${telefono}`);
const historial = historialRaw ? JSON.parse(historialRaw) : [];
// ... procesar ...
await redis.set(`chat:${telefono}`, JSON.stringify(historial), { EX: 86400 });
```

**Task Breakdown:**
- Agregar Redis en Railway (UI): Small (30min)
- Crear src/lib/redis.ts: Small (1h)
- Integrar cache de cursos en ruta GET /api/cursos: Small (2h)

**Dependencies:** REQ-001, Railway Redis addon.

---

#### REQ-004: Webhook WhatsApp con validación HMAC
**Descripción:** Endpoint POST /api/meta/webhook que valida la firma HMAC-SHA256 de Meta antes de procesar mensajes. Protege contra requests no autorizados.

**Acceptance Criteria:**
- [ ] Valida header `x-hub-signature-256` con HMAC-SHA256 y `META_APP_SECRET`.
- [ ] Requests sin firma válida devuelven 403.
- [ ] GET /api/meta/webhook valida el token de verificación de Meta (para el setup inicial).
- [ ] POST /api/meta/webhook procesa mensajes de texto entrantes.

**Technical Specification:**
```typescript
// src/middleware/hmac.middleware.ts
export function verifyMetaHmac(req, res, next) {
  const signature = req.headers["x-hub-signature-256"] as string;
  const body = JSON.stringify(req.body);
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.META_APP_SECRET!)
    .update(body)
    .digest("hex");
  if (signature !== expected) return res.status(403).json({ error: "Firma inválida" });
  next();
}
```

**Task Breakdown:**
- Implementar hmac.middleware.ts: Small (2h)
- Crear ruta POST /api/meta/webhook con lógica de extracción de mensajes: Medium (4h)
- Crear ruta GET /api/meta/webhook para verificación inicial de Meta: Small (1h)

**Dependencies:** REQ-001, Meta WhatsApp Business API (cuenta y app configurada).

---

#### REQ-005: Agente Claude AI con memoria de conversación
**Descripción:** Función `responderMensaje(telefono, mensaje)` que usa Claude claude-sonnet-4-6, mantiene historial en Redis (últimos 10 mensajes), enriquece el contexto con Notion via RAG, y persiste en MySQL.

**Acceptance Criteria:**
- [ ] Usa modelo `claude-sonnet-4-6` via `@anthropic-ai/sdk`.
- [ ] max_tokens: 500 (respuestas concisas para WhatsApp).
- [ ] System prompt en español, rol de asistente de MEA International.
- [ ] Incluye contexto de la web de MEA (cursos, precios, modalidades, contacto).
- [ ] Incluye contexto de Notion via función `getNotionContext(mensaje)`.
- [ ] Historial limitado a últimos 10 mensajes (`historial.slice(-10)`).
- [ ] Persiste user + assistant message en MySQL (MensajeWhatsApp).
- [ ] Crea Lead automáticamente si es la primera vez que el teléfono escribe.

**Technical Specification:**
```typescript
// src/lib/claude.ts
export async function responderMensaje(telefono: string, mensaje: string): Promise<string> {
  const historialRaw = await redis.get(`chat:${telefono}`);
  const historial = historialRaw ? JSON.parse(historialRaw) : [];
  historial.push({ role: "user", content: mensaje });

  const notionCtx = await getNotionContext(mensaje);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: `Eres el asistente virtual de MEA International.
Respondes en español, de forma amable y concisa (máximo 3 párrafos cortos).
Si no sabés algo, decí que un asesor se pondrá en contacto.
No inventes precios ni fechas que no estén en el contexto.
INFORMACIÓN DE MEA INTERNATIONAL:
${WEB_CONTEXT}
INFORMACIÓN ADICIONAL (Notion):
${notionCtx}`,
    messages: historial.slice(-10),
  });

  const respuesta = (response.content[0] as any).text;
  historial.push({ role: "assistant", content: respuesta });
  await redis.set(`chat:${telefono}`, JSON.stringify(historial), { EX: 86400 });
  await guardarMensajes(telefono, mensaje, respuesta);
  return respuesta;
}
```

**Task Breakdown:**
- Crear src/lib/claude.ts con WEB_CONTEXT y función responderMensaje: Medium (6h)
- Implementar función guardarMensajes (upsert Lead + crear Conversación + MensajeWhatsApp): Medium (4h)
- Crear src/lib/notion-context.ts con getNotionContext usando @notionhq/client: Medium (5h)
- Crear src/lib/whatsapp-send.ts para enviar respuestas via Meta API: Small (3h)
- Integrar todo en el webhook: Medium (3h)

**Dependencies:** REQ-002, REQ-003, REQ-004, ANTHROPIC_API_KEY, NOTION_TOKEN.

---

#### REQ-006: Cloudflare DNS + CDN + WAF
**Descripción:** Dominio meainternational.com configurado en Cloudflare con registros DNS apuntando a Vercel y Railway, proxy activo (naranja), WAF con OWASP ruleset, Bot Fight Mode y Rate Limiting.

**Acceptance Criteria:**
- [ ] Nameservers del dominio actualizados a los de Cloudflare.
- [ ] CNAME `@` y `www` apuntan a `cname.vercel-dns.com` con proxy activo.
- [ ] CNAME `api` apunta al dominio de Railway del backend con proxy activo.
- [ ] WAF Managed Rules (OWASP) activo.
- [ ] Bot Fight Mode ON.
- [ ] Rate Limiting: máx 100 req/min por IP.

**Task Breakdown:**
- Crear cuenta Cloudflare y agregar dominio: Small (1h)
- Configurar registros DNS (3 CNAMEs): Small (1h)
- Cambiar nameservers en registrador de dominio: Small (30min)
- Activar WAF + Bot Fight Mode + Rate Limiting: Small (1h)

**Dependencies:** Dominio registrado, Railway backend con dominio público, Vercel con dominio custom.

---

#### REQ-007: Variables de entorno y CI/CD
**Descripción:** Variables de entorno configuradas correctamente en Railway y Vercel. Estrategia de branches: ramas `sesion-YYYYMMDD` para trabajo diario, merge a main al final del día dispara el deploy.

**Acceptance Criteria:**
- [ ] Railway tiene todas las variables del backend configuradas.
- [ ] Vercel tiene `NEXT_PUBLIC_API_URL=https://api.meainternational.com`.
- [ ] Push a main → Railway redeploya automáticamente.
- [ ] Push a rama sesion-* → NO dispara deploy (solo preview en Vercel).

**Technical Specification:**
```bash
# Variables Railway (backend)
DATABASE_URL=          # MySQL Railway (auto)
REDIS_URL=             # Redis Railway (auto)
JWT_SECRET=            # openssl rand -hex 32
META_WHATSAPP_TOKEN=   # Token permanente Meta
META_PHONE_ID=         # ID del teléfono
META_WABA_ID=          # ID del WABA
META_WEBHOOK_VERIFY_TOKEN=  # Token inventado para verificación
META_APP_SECRET=       # App secret de Meta (HMAC)
ANTHROPIC_API_KEY=     # API key Anthropic
NOTION_TOKEN=          # Token Notion
FRONTEND_URL=          # https://meainternational.com

# Variables Vercel (frontend)
NEXT_PUBLIC_API_URL=https://api.meainternational.com
```

**Task Breakdown:**
- Configurar variables en Railway: Small (1h)
- Configurar NEXT_PUBLIC_API_URL en Vercel: Small (30min)
- Documentar estrategia de branches en README: Small (1h)

**Dependencies:** Railway backend, Vercel project, Meta Business API, Anthropic API key.

---

### Should Have (P1) — Importante, no bloqueante

#### REQ-008: Auth JWT para endpoints admin
**Descripción:** Middleware JWT que protege las rutas /api/leads y /api/cursos (write operations). Los admins se autentican con email + password (bcrypt).

**Acceptance Criteria:**
- [ ] POST /api/auth/login devuelve JWT si las credenciales son correctas.
- [ ] Rutas protegidas devuelven 401 si no hay token válido.
- [ ] Passwords hasheados con bcrypt.
- [ ] JWT expiración: 24 horas.

**Task Breakdown:**
- Crear auth.middleware.ts con verificación JWT: Small (3h)
- Crear POST /api/auth/login: Small (3h)
- Aplicar middleware a rutas admin: Small (1h)

**Dependencies:** REQ-002 (modelo Admin en Prisma).

---

#### REQ-009: Panel admin básico en Next.js
**Descripción:** Página /admin en Next.js que lista leads y sus conversaciones de WhatsApp. Solo visible para admins autenticados.

**Acceptance Criteria:**
- [ ] Lista de leads con nombre, teléfono, estado, fecha.
- [ ] Click en un lead muestra el historial de conversación.
- [ ] Paginación simple (10 leads por página).
- [ ] Ruta protegida con verificación de JWT en frontend.

**Task Breakdown:**
- Crear /app/admin/page.tsx con lista de leads: Medium (6h)
- Crear /app/admin/leads/[id]/page.tsx con conversaciones: Medium (4h)
- Implementar auth guard en frontend: Small (2h)

**Dependencies:** REQ-007, REQ-008.

---

### Nice to Have (P2) — Fase futura

#### REQ-010: Storage de archivos con Cloudflare R2
**Descripción:** Almacenamiento de brochures, imágenes de cursos y archivos enviados por WhatsApp en Cloudflare R2.

**Dependencies:** REQ-006 (Cloudflare cuenta activa).

---

#### REQ-011: Email con Resend
**Descripción:** Envío de email de confirmación cuando un lead se inscribe, usando Resend.

**Dependencies:** REQ-002 (modelo Lead con email).

---

## Non-Functional Requirements

### Performance
- API endpoints: < 300ms en percentil 95.
- Respuesta del agente WhatsApp: < 10 segundos end-to-end (incluye llamada a Claude AI).
- Cache de cursos en Redis: evita queries repetidas a MySQL.
- Historial de conversación en Redis: evita queries a MySQL en cada mensaje.

### Security
- Validación HMAC en todos los mensajes entrantes de Meta.
- JWT con expiración 24h para acceso admin.
- Passwords admin hasheados con bcrypt.
- Cloudflare WAF con OWASP ruleset activo.
- Rate limiting: 100 req/min por IP.
- Variables de entorno nunca en el código fuente.
- `.env` en `.gitignore`.
- `.mcp.json` en `.gitignore` (ya configurado).

### Reliability
- Uptime objetivo: > 99.5% (Railway SLA).
- Si Claude AI falla, el webhook debe responder 200 a Meta igualmente (para no perder el evento).
- Redis TTL de 24h en historial: evita memoria infinita.

### Scalability
- Railway escala automáticamente en picos.
- Arquitectura stateless en backend (sesiones en Redis, no en memoria).

---

## Technical Considerations

### System Architecture

```
Usuario (WhatsApp)
  ↓
Meta WhatsApp Business API
  ↓
Cloudflare (CDN + WAF + DNS)
  ↓
Railway → Express + TypeScript (Backend :4000)
  ├── MySQL + Prisma (datos: Lead, Curso, Conversacion, Mensaje, Admin)
  ├── Redis (cache + historial de chat + JWT blacklist)
  └── POST /api/meta/webhook
        ↓
        Claude AI (claude-sonnet-4-6)
        ↓
        RAG: WEB_CONTEXT (hardcoded) + Notion API (dinámico)
              ↓
        Respuesta enviada via META_WHATSAPP_TOKEN → WhatsApp usuario

Vercel → Next.js 16 (Frontend — ya existe)
  ↓ (API calls con JWT)
Railway → Express (Backend)
```

### Technology Stack

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | Next.js 16 + Vercel | Ya existe |
| Backend | Express + TypeScript | Nuevo |
| ORM | Prisma | Nuevo |
| Base de datos | MySQL en Railway | Nuevo |
| Cache / Sesiones | Redis en Railway | Nuevo |
| IA | Claude claude-sonnet-4-6 via @anthropic-ai/sdk | Nuevo |
| RAG | Notion API (@notionhq/client) + WEB_CONTEXT | Nuevo |
| WhatsApp | Meta WhatsApp Business API | Nuevo |
| CDN/WAF | Cloudflare | Nuevo |
| Email | Resend | Fase futura |
| Storage | Cloudflare R2 | Fase futura |
| CI/CD | GitHub + Vercel + Railway | Nuevo |

### External Dependencies

1. **Meta WhatsApp Business API**
   - Propósito: Recibir y enviar mensajes de WhatsApp.
   - Requiere: Meta Business account, app con número aprobado.
   - Falla: Si el webhook falla, responder 200 igualmente para que Meta no reintente indefinidamente.

2. **Anthropic API (Claude claude-sonnet-4-6)**
   - Propósito: Generar respuestas del agente con contexto de MEA.
   - Rate limits: Gestionar con retry logic si hay throttling.
   - Falla: Log el error, responder al usuario que el asesor se pondrá en contacto.

3. **Notion API**
   - Propósito: RAG dinámico — buscar información actualizada de cursos, precios, FAQs.
   - Requiere: NOTION_TOKEN con acceso a las páginas relevantes.
   - Falla: Usar solo WEB_CONTEXT como fallback.

### Database Schema (Prisma completo)

Ver REQ-002 para el schema completo. Relaciones clave:
- `Lead` 1:N `ConversacionWhatsApp`
- `ConversacionWhatsApp` 1:N `MensajeWhatsApp`
- `Lead.telefono` UNIQUE — un número = un lead.

### File Structure Backend

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── leads.ts
│   │   ├── cursos.ts
│   │   └── whatsapp.webhook.ts
│   ├── lib/
│   │   ├── claude.ts
│   │   ├── notion-context.ts
│   │   ├── whatsapp-send.ts
│   │   ├── redis.ts
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── hmac.middleware.ts
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── package.json
└── tsconfig.json
```

---

## Implementation Roadmap

### Fase 1: Backend Express + TypeScript (Semana 1)
**Goal:** API corriendo en Railway con estructura completa.

- [ ] 1.1 Inicializar proyecto backend (`mkdir backend`, npm init, tsconfig)
- [ ] 1.2 Instalar dependencias (express, prisma, redis, anthropic, notionhq, etc.)
- [ ] 1.3 Crear src/index.ts con middlewares y rutas base
- [ ] 1.4 Crear src/lib/prisma.ts y src/lib/redis.ts
- [ ] 1.5 Crear Railway project y conectar repo
- [ ] 1.6 Deploy inicial a Railway (health check verde)

**Checkpoint Fase 1:** GET /health devuelve 200 en Railway.

---

### Fase 2: MySQL + Prisma (Semana 1)
**Goal:** Base de datos con todos los modelos funcionando.

- [ ] 2.1 Agregar MySQL en Railway (UI)
- [ ] 2.2 Escribir prisma/schema.prisma completo
- [ ] 2.3 Configurar DATABASE_URL en Railway
- [ ] 2.4 `npx prisma migrate dev --name init` + `npx prisma generate`
- [ ] 2.5 Implementar rutas CRUD básicas: GET /api/cursos, GET /api/leads

**Checkpoint Fase 2:** GET /api/cursos devuelve datos de MySQL.

---

### Fase 3: Redis (Semana 2)
**Goal:** Cache y sesiones funcionando.

- [ ] 3.1 Agregar Redis en Railway (UI)
- [ ] 3.2 Configurar REDIS_URL en Railway
- [ ] 3.3 Implementar src/lib/redis.ts
- [ ] 3.4 Agregar cache de cursos en GET /api/cursos
- [ ] 3.5 Verificar TTL y reconexión automática

**Checkpoint Fase 3:** GET /api/cursos sirve desde Redis en el segundo request.

---

### Fase 4: Agente WhatsApp con Claude AI (Semana 2)
**Goal:** Bot respondiendo por WhatsApp con memoria de conversación.

- [ ] 4.1 Implementar hmac.middleware.ts
- [ ] 4.2 Crear GET /api/meta/webhook (verificación Meta)
- [ ] 4.3 Crear POST /api/meta/webhook (recepción de mensajes)
- [ ] 4.4 Implementar src/lib/notion-context.ts
- [ ] 4.5 Implementar src/lib/claude.ts con responderMensaje()
- [ ] 4.6 Implementar función guardarMensajes() (Lead upsert + Conversacion + Mensajes)
- [ ] 4.7 Implementar src/lib/whatsapp-send.ts
- [ ] 4.8 Integrar todo: webhook → claude → whatsapp-send
- [ ] 4.9 Configurar webhook URL en Meta Business Manager
- [ ] 4.10 Test end-to-end: enviar mensaje y recibir respuesta

**Checkpoint Fase 4:** Mensaje de WhatsApp → respuesta del bot en < 10 segundos.

---

### Fase 5: Cloudflare DNS + WAF (Semana 3)
**Goal:** Dominio protegido con CDN y WAF.

- [ ] 5.1 Crear cuenta Cloudflare y agregar dominio
- [ ] 5.2 Cambiar nameservers en registrador
- [ ] 5.3 Configurar CNAMEs (@, www → Vercel; api → Railway)
- [ ] 5.4 Activar WAF Managed Rules (OWASP)
- [ ] 5.5 Activar Bot Fight Mode
- [ ] 5.6 Configurar Rate Limiting (100 req/min por IP)
- [ ] 5.7 Verificar que meainternational.com y api.meainternational.com funcionan

**Checkpoint Fase 5:** api.meainternational.com/health devuelve 200 con proxy Cloudflare.

---

### Fase 6: CI/CD y Variables de entorno (Semana 3)
**Goal:** Deploy automatizado al mergear a main.

- [ ] 6.1 Configurar todas las variables en Railway
- [ ] 6.2 Configurar NEXT_PUBLIC_API_URL en Vercel
- [ ] 6.3 Implementar estrategia de branches (sesion-YYYYMMDD)
- [ ] 6.4 Verificar que push a main dispara redeploy en Railway y Vercel
- [ ] 6.5 Test completo del flujo: código → commit → merge → deploy → test

**Checkpoint Fase 6:** Un push a main redeploya automáticamente todo el stack.

---

### Fase 7: Panel Admin básico (Semana 4)
**Goal:** Visibilidad sobre leads y conversaciones.

- [ ] 7.1 Implementar POST /api/auth/login con JWT
- [ ] 7.2 Implementar auth.middleware.ts para rutas protegidas
- [ ] 7.3 Crear /app/admin/page.tsx con lista de leads
- [ ] 7.4 Crear /app/admin/leads/[id]/page.tsx con conversaciones
- [ ] 7.5 Implementar auth guard en frontend

**Checkpoint Fase 7:** Admin puede ver leads y conversaciones en /admin.

---

## Out of Scope

1. **Cloudflare R2 (Storage)** — Fase futura. No es necesario para el lanzamiento.
2. **Email con Resend** — Fase futura. El bot de WhatsApp cubre la atención inicial.
3. **Dashboard de analytics** — No en v1. Los datos están en MySQL para consultas directas.
4. **App móvil** — No aplica. WhatsApp es el canal de atención.
5. **Multi-idioma** — Solo español. El mercado de MEA es hispanohablante.
6. **Integración con CRM externo** — No en v1. La BD de Railway cumple esa función.

---

## Open Questions & Risks

### Open Questions

#### Q1: ¿Cuál es el contenido exacto del WEB_CONTEXT en claude.ts?
- **Estado:** Pendiente.
- **Acción:** Guido debe proveer la información de cursos, precios, modalidades y contacto para hardcodear en `WEB_CONTEXT`.
- **Impacto:** Alto — sin esto el bot no puede responder bien.
- **Deadline:** Antes de Fase 4.

#### Q2: ¿Está el número de WhatsApp aprobado en Meta Business?
- **Estado:** Verificar.
- **Acción:** Confirmar que META_WHATSAPP_TOKEN, META_PHONE_ID y META_WABA_ID están disponibles.
- **Impacto:** Bloqueante para Fase 4.

#### Q3: ¿Qué páginas de Notion usa el bot para el RAG?
- **Estado:** Pendiente.
- **Acción:** Definir qué databases o páginas de Notion contienen la info dinámica (FAQs, precios actualizados, fechas de inicio).
- **Impacto:** Medio — el bot funciona sin Notion, pero con menos contexto.

### Risks & Mitigation

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Meta rechaza el webhook (URL no HTTPS) | Media | Bloqueante | Usar dominio Cloudflare con SSL desde el primer deploy |
| Claude AI latencia > 10s | Baja | Media | max_tokens: 500 limita el tiempo de generación; Railway region más cercana |
| Railway downtime | Baja | Alta | Health checks + Railway SLA 99.5% |
| Prompt injection via WhatsApp | Media | Alta | System prompt con instrucciones claras; no ejecutar código del usuario |
| Leads duplicados (mismo número) | Baja | Media | Lead.telefono UNIQUE + upsert en Prisma |
| Costo API Anthropic en pico | Media | Media | max_tokens: 500 controla el costo; monitorear uso mensual |

---

## Validation Checkpoints

### Checkpoint 1: Fin de Fase 1 + 2
- [ ] GET /health devuelve 200 en Railway con URL pública.
- [ ] GET /api/cursos devuelve datos (puede ser array vacío).
- [ ] `npx prisma migrate dev` no tiene errores.

**Si falla:** Revisar variables de entorno en Railway, logs de Railway.

---

### Checkpoint 2: Fin de Fase 3 + 4
- [ ] Enviar mensaje de WhatsApp al número de MEA → bot responde en < 10s.
- [ ] Redis tiene key `chat:{telefono}` con el historial.
- [ ] MySQL tiene registro en Lead, ConversacionWhatsApp y MensajeWhatsApp.
- [ ] Validación HMAC rechaza requests sin firma (probar con curl sin header).

**Si falla:** Verificar META_APP_SECRET, logs de Railway, test manual de Claude con script.

---

### Checkpoint 3: Fin de Fase 5 + 6
- [ ] api.meainternational.com/health devuelve 200 via Cloudflare (verificar header `cf-ray`).
- [ ] meainternational.com carga el frontend via Cloudflare.
- [ ] Push a rama sesion-* NO dispara deploy en Railway.
- [ ] Push a main SÍ redeploya Railway y Vercel.

**Si falla:** Verificar CNAME records en Cloudflare, revisar Railway deployment triggers.

---

### Checkpoint 4: Fin de Fase 7
- [ ] POST /api/auth/login devuelve JWT con credenciales correctas.
- [ ] GET /api/leads con JWT devuelve lista de leads.
- [ ] /admin en Next.js muestra leads y conversaciones.

**Si falla:** Verificar JWT_SECRET en Railway, CORS entre frontend y api.meainternational.com.

---

## Appendix: Task Breakdown Hints

### Estructura sugerida para Taskmaster (6 tareas principales)

**Tarea 1: Backend Express + TypeScript en Railway** (~6h)
- 1.1 Inicializar proyecto y tsconfig (1h)
- 1.2 Instalar dependencias (30min)
- 1.3 Crear src/index.ts con middlewares (2h)
- 1.4 Crear Railway project + primer deploy (2h)
- 1.5 Verificar health check en URL pública (30min)

**Tarea 2: MySQL + Prisma** (~4h)
- 2.1 Agregar MySQL en Railway (30min)
- 2.2 Escribir schema.prisma completo (2h)
- 2.3 Migrate + generate (30min)
- 2.4 Rutas básicas GET /api/cursos y /api/leads (1h)

**Tarea 3: Redis** (~3h)
- 3.1 Agregar Redis en Railway (30min)
- 3.2 Crear src/lib/redis.ts (1h)
- 3.3 Cache de cursos (1h)
- 3.4 Verificación de TTL (30min)

**Tarea 4: Agente WhatsApp con Claude AI** (~26h — la más compleja)
- 4.1 hmac.middleware.ts (2h)
- 4.2 Rutas GET + POST /api/meta/webhook (4h)
- 4.3 src/lib/notion-context.ts (5h)
- 4.4 src/lib/claude.ts con responderMensaje (6h)
- 4.5 guardarMensajes() en Prisma (4h)
- 4.6 src/lib/whatsapp-send.ts (3h)
- 4.7 Integración + test end-to-end (2h)

**Tarea 5: Cloudflare + CI/CD** (~6h)
- 5.1 Setup Cloudflare + DNS (2h)
- 5.2 WAF + Bot Fight + Rate Limiting (1h)
- 5.3 Variables de entorno Railway + Vercel (1h)
- 5.4 Estrategia de branches + verificación CI/CD (2h)

**Tarea 6: Panel Admin** (~13h)
- 6.1 JWT auth backend (POST /api/auth/login + middleware) (6h)
- 6.2 /app/admin/page.tsx (lista de leads) (4h)
- 6.3 /app/admin/leads/[id]/page.tsx (conversaciones) (3h)

**Total estimado: ~58 horas (~4 semanas a tiempo parcial)**

### Paralelizable
- Tarea 1 → 2 → 3 deben ser secuenciales (dependencias de infra).
- Tarea 4 puede comenzar en paralelo con Tarea 2 para la parte de Notion context (no depende de MySQL).
- Tarea 5 puede comenzar en paralelo con Tarea 4 (Cloudflare no depende del agente).
- Tarea 6 puede comenzar en paralelo con Tarea 5.

### Ruta crítica
1.3 (Backend) → 2.2 (Schema) → 4.4 (Claude) → 4.7 (Test E2E) → 5.4 (CI/CD) → Go live

---

**End of PRD**

*Optimizado para task-master-ai. Todos los requisitos incluyen criterios de aceptación testeables, especificaciones técnicas con código real, y hints de breakdown para generación automática de tareas.*
