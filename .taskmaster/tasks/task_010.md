# Task ID: 10

**Title:** Implement Claude AI Agent with Conversation Memory

**Status:** done

**Dependencies:** 4 ✓, 9 ✓

**Priority:** high

**Description:** Create core AI agent function using Claude Sonnet 4 that maintains conversation history in Redis and generates contextual responses.

**Details:**

Install Anthropic SDK: `npm install @anthropic-ai/sdk`. Create `src/lib/claude.ts`. Define WEB_CONTEXT constant with MEA International information (courses, prices, modalities, contact - to be provided by Guido). Implement async function responderMensaje(telefono: string, mensaje: string): Promise<string>. 1) Get conversation history from Redis key `chat:{telefono}`, parse JSON array or default to []. 2) Add user message to history: {role: 'user', content: mensaje}. 3) Call getNotionContext(mensaje) to get additional context. 4) Create Anthropic client with ANTHROPIC_API_KEY. 5) Call client.messages.create with model 'claude-sonnet-4-6' (note: verify latest model name), max_tokens: 500, system prompt in Spanish: 'Eres el asistente virtual de MEA International. Respondes en español, de forma amable y concisa (máximo 3 párrafos cortos). Si no sabés algo, decí que un asesor se pondrá en contacto. No inventes precios ni fechas que no estén en el contexto. INFORMACIÓN DE MEA INTERNATIONAL: {WEB_CONTEXT} INFORMACIÓN ADICIONAL (Notion): {notionCtx}', messages: history.slice(-10) (last 10 to limit context). 6) Extract text from response.content[0].text. 7) Add assistant message to history. 8) Save history to Redis with 86400s TTL. 9) Return response text.

**Test Strategy:**

Test responderMensaje with various queries (course info, prices, general questions). Verify responses are in Spanish, concise, and don't hallucinate. Test conversation continuity - second message should reference first. Test history limit (11th message should drop first). Verify Redis stores history with correct TTL. Test graceful handling if Claude API fails.

## Subtasks

### 10.1. Install Anthropic SDK and verify API credentials

**Status:** pending  
**Dependencies:** None  

Install @anthropic-ai/sdk package and verify ANTHROPIC_API_KEY environment variable is configured correctly for Claude API access.

**Details:**

Navigate to /backend directory (created in Task 1). Run `npm install @anthropic-ai/sdk` to install the official Anthropic SDK for Node.js. Verify package.json includes '@anthropic-ai/sdk' in dependencies. Add ANTHROPIC_API_KEY to Railway environment variables in the backend service settings (obtain from https://console.anthropic.com). Add to backend/.env for local development. Verify the latest Claude Sonnet 4 model identifier - as of 2025, the model name is 'claude-sonnet-4-20250514' or check Anthropic docs for current version. Update backend/.env.example to include ANTHROPIC_API_KEY=your_key_here. The SDK provides TypeScript types and handles streaming, rate limits, and retries automatically.

### 10.2. Define WEB_CONTEXT constant with MEA International information

**Status:** pending  
**Dependencies:** 10.1  

Create WEB_CONTEXT constant containing comprehensive MEA International business information including courses, prices, modalities, schedules, and contact details to be used in the Claude system prompt.

**Details:**

Create backend/src/lib/claude.ts file. Define a TypeScript constant WEB_CONTEXT as a multi-line string containing MEA International's core information: (1) Company overview and mission, (2) Available courses with names and descriptions (this information needs to be provided by Guido - placeholder: 'Curso de Programación Full Stack, Curso de Marketing Digital, Curso de Diseño UX/UI'), (3) Pricing information (placeholder: 'Consultar precios actualizados'), (4) Modalities offered (presencial, online, híbrido), (5) Course duration details, (6) Contact information (email: info@meainternational.com, phone, WhatsApp number), (7) Enrollment process, (8) Payment methods accepted. Format in clear Spanish text optimized for LLM consumption. Keep under 1500 characters to fit in system prompt. Add TODO comment: '// TODO: Update with actual MEA International course catalog and pricing from Guido'. This will be the primary knowledge base for the AI agent.

### 10.3. Implement conversation history retrieval from Redis

**Status:** pending  
**Dependencies:** 10.2  

Create helper function to fetch and parse existing conversation history from Redis using the chat:{telefono} key pattern, returning an array of message objects.

**Details:**

In backend/src/lib/claude.ts, import the Redis client from '../lib/redis' (configured in Task 4). Define TypeScript interface: `interface Message { role: 'user' | 'assistant'; content: string; }`. Implement async function `getConversationHistory(telefono: string): Promise<Message[]>` that: (1) Constructs Redis key as `chat:${telefono}`, (2) Calls redis.get(key) to fetch history JSON string, (3) If result is null or empty, returns empty array [], (4) Parses JSON string to Message[] array using JSON.parse() with try-catch for error handling, (5) Returns parsed array, or [] if parsing fails. Add logging for debug: console.log(`Fetched ${history.length} messages for ${telefono}`). This function isolates Redis interaction and provides clean conversation history retrieval for the main AI agent function.

### 10.4. Implement conversation history persistence to Redis with TTL

**Status:** pending  
**Dependencies:** 10.3  

Create helper function to save updated conversation history back to Redis with 24-hour TTL using the chat:{telefono} key pattern.

**Details:**

In backend/src/lib/claude.ts, implement async function `saveConversationHistory(telefono: string, history: Message[]): Promise<void>` that: (1) Constructs Redis key as `chat:${telefono}`, (2) Serializes history array to JSON string using JSON.stringify(history), (3) Calls redis.setEx(key, 86400, jsonString) to store with 24-hour TTL (86400 seconds), (4) Wraps in try-catch to handle Redis connection errors gracefully - log error but don't throw (persistence failure shouldn't break the bot), (5) Logs success: console.log(`Saved ${history.length} messages for ${telefono} with 24h TTL`). This function ensures conversation context is maintained for up to 24 hours, allowing multi-turn conversations while automatically expiring old conversations to manage Redis memory.

### 10.5. Implement main responderMensaje function with Claude API integration

**Status:** pending  
**Dependencies:** 10.1, 10.2, 10.3, 10.4  

Create the core AI agent function that orchestrates conversation history, calls Claude Sonnet 4 API with proper system prompt, and returns the assistant response.

**Details:**

In backend/src/lib/claude.ts, import Anthropic from '@anthropic-ai/sdk' and getNotionContext from './notion-context' (will be implemented in Task 9, use mock for now). Implement async function `responderMensaje(telefono: string, mensaje: string): Promise<string>` that: (1) Calls getConversationHistory(telefono) to fetch existing history, (2) Appends user message: history.push({ role: 'user', content: mensaje }), (3) Calls await getNotionContext(mensaje) to get additional context (wrap in try-catch, use empty string if fails), (4) Constructs system prompt in Spanish: `Eres el asistente virtual de MEA International. Respondes en español, de forma amable y concisa (máximo 3 párrafos cortos). Si no sabés algo, decí que un asesor se pondrá en contacto pronto. No inventes precios ni fechas que no estén en el contexto proporcionado. INFORMACIÓN DE MEA INTERNATIONAL: ${WEB_CONTEXT} INFORMACIÓN ADICIONAL (Notion): ${notionCtx}`, (5) Creates Anthropic client with new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), (6) Calls client.messages.create with: model (verify latest name, likely 'claude-sonnet-4-20250514'), max_tokens: 500, system: systemPrompt, messages: history.slice(-10) (limits to last 10 messages to control context window), (7) Extracts response text from response.content[0].text (handle type guards for content array), (8) Appends assistant response to history: history.push({ role: 'assistant', content: responseText }), (9) Calls saveConversationHistory(telefono, history), (10) Returns responseText. Add comprehensive error handling with try-catch, log errors, throw with descriptive message if Claude API fails.
