# Task ID: 55

**Title:** Human Handoff — Traspaso a Asesor Humano

**Status:** pending

**Dependencies:** 34 ✓

**Priority:** high

**Description:** Implementar sistema de traspaso de conversación WhatsApp del bot al asesor humano, con reactivación automática por timeout de 1 hora.

**Details:**

No details provided.

**Test Strategy:**

No test strategy provided.

## Subtasks

### 55.1. Crear lib/human-handoff.ts con funciones Redis

**Status:** pending  
**Dependencies:** None  

Crear backend/src/lib/human-handoff.ts con 4 funciones: activarModoHumano(telefono) guarda key 'handoff:{telefono}' en Redis TTL 3600s; desactivarModoHumano(telefono) elimina la key; estaModoHumano(telefono) retorna boolean; tiempoRestanteHandoff(telefono) retorna TTL restante en segundos con redis.ttl(). Importar cliente Redis de ./redis.

### 55.2. Agregar sendTemplateMessage() a lib/whatsapp-send.ts

**Status:** pending  
**Dependencies:** 55.1  

Agregar función sendTemplateMessage(telefono, templateName, params[]) que hace POST a Meta Graph API v21.0/{META_PHONE_ID}/messages con type 'template', language { code: 'es' }. Mapear params[] como components[0].parameters con type 'text'. Reutilizar el mismo fetch + headers + retry exponencial del sendWhatsAppMessage existente.

### 55.3. Agregar variables de entorno MIRCE_PERSONAL_PHONE y MIRCE_BOT_PHONE

**Status:** pending  
**Dependencies:** None  

Agregar en Railway (production) y en .env (local): MIRCE_PERSONAL_PHONE=50250191753 (número que recibe notificaciones de escalada) y MIRCE_BOT_PHONE=50256311728 (número desde donde Mirce escribe /bot para reactivar). Documentar ambas variables en el README del backend.

### 55.4. Actualizar agentRouter.ts — instrucción de escalada en cada agente

**Status:** pending  
**Dependencies:** None  

Al final del systemPrompt de CADA agente en AGENT_CONFIGS (Nuevo, Contactado, Interesado, Propuesta, Negociacion, Cerrado, default) agregar: 'Si el cliente pregunta algo fuera de tu conocimiento o pide hablar con una persona, responde ÚNICAMENTE con este JSON exacto sin texto adicional: {"accion": "escalar_humano", "motivo": "breve razón"}. No inventes información. Si no sabes → escala.'

### 55.5. claude.ts — bloque de detección y ejecución de escalada

**Status:** pending  
**Dependencies:** 55.1, 55.2, 55.3, 55.4  

Después de recibir respuesta de Claude y ANTES de retornarla: 1) Intentar JSON.parse() de la respuesta. 2) Si parsed.accion === 'escalar_humano': a) Llamar activarModoHumano(telefono), b) Actualizar lead en Prisma a etapa EscaladoHumano, c) Retornar mensaje humanizado al cliente ('Un momento por favor 😊 Voy a conectarte con una de nuestras asesoras...'), d) Llamar sendTemplateMessage(MIRCE_PERSONAL_PHONE, 'notificacion_escalada_interna', [telefono, parsed.motivo]) con template de alerta. 3) Si JSON.parse falla → retornar respuesta normal.

### 55.6. claude.ts — silenciar bot cuando modo humano está activo

**Status:** pending  
**Dependencies:** 55.1, 55.5  

Al INICIO de responderMensaje(), antes de cualquier lógica: 1) if (await estaModoHumano(telefono)): a) Obtener segundos restantes con tiempoRestanteHandoff(), b) Calcular minutosRestantes = Math.ceil(segundos / 60), c) Enviar al cliente: 'Hola de nuevo 😊 Tu consulta ya está en manos de nuestra asesora. En breve te contacta. Si en {minutosRestantes} minutos no recibes respuesta, el asistente automático se reactiva.' d) return early (no llamar a Claude).

### 55.7. whatsapp.webhook.ts — comando /bot para reactivación manual

**Status:** pending  
**Dependencies:** 55.1, 55.6  

Al inicio del handler POST, antes de llamar responderMensaje(): Si telefono === process.env.MIRCE_BOT_PHONE AND mensaje.startsWith('/bot '): a) Extraer telefonoCliente = mensaje.replace('/bot ', '').trim(), b) Llamar desactivarModoHumano(telefonoCliente), c) Enviar confirmación a MIRCE_BOT_PHONE: '✅ Bot reactivado para +{telefonoCliente}', d) return res.sendStatus(200). Importar estaModoHumano y desactivarModoHumano desde ../lib/human-handoff.
