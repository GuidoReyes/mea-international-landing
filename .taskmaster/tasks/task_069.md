# Task ID: 69

**Title:** Implement complete Notion RAG system for WhatsApp bot

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Build a multi-page retrieval-augmented generation system that connects the WhatsApp bot with MEA's complete Notion knowledge base, enabling accurate responses about pricing, schedules, courses, instructors, methodology, requirements, certifications, and availability using intent-based routing, Redis caching, and real-time database queries.

**Details:**

**Architecture Overview:**

The current `backend/src/lib/notion-context.ts` has critical limitations:
1. Only fetches ONE hardcoded pricing page (ID: 35d83de9-b32b-8001-bec4-edb3e3e4665c)
2. Additional search never executes due to bug: `if (searchTerms && sections.length === 0)` is always false after pricing page loads
3. Context limited to 1,500 chars - insufficient for multi-topic responses
4. No intent-based routing - can't distinguish between pricing vs schedule queries
5. No real-time course availability from database

**Implementation Strategy:**

**Subtask 69.1: Audit and map Notion pages**
- Create constant `NOTION_PAGES` object mapping intents to page IDs:
```typescript
const NOTION_PAGES = {
  pricing: '35d83de9-b32b-8001-bec4-edb3e3e4665c',
  schedules: 'PAGE_ID_HERE', // Get from Notion workspace
  courses: 'PAGE_ID_HERE',
  instructors: 'PAGE_ID_HERE',
  methodology: 'PAGE_ID_HERE',
  requirements: 'PAGE_ID_HERE',
  certifications: 'PAGE_ID_HERE',
  faq: 'PAGE_ID_HERE',
  payment_policy: 'PAGE_ID_HERE'
} as const;
```
- Document process: Navigate to each Notion page → Copy page ID from URL → Verify NOTION_TOKEN has read access
- Test token access with `notion.pages.retrieve()` for each page ID

**Subtask 69.2: Fix search bug in notion-context.ts**

Current buggy code (lines 78-90):
```typescript
if (searchTerms && sections.length === 0) { // BUG: always false!
  const searchResults = await client.search(...);
  // never executes
}
```

Fixed approach:
```typescript
// Step 1: Execute intent-based page fetching first
const intentPages = detectIntent(msg);
for (const pageId of intentPages) {
  const text = await fetchPageText(pageId);
  if (text) sections.push(text);
}

// Step 2: Execute additional Notion search INDEPENDENTLY
const searchTerms = extractSearchTerms(msg);
if (searchTerms) { // Remove sections.length check!
  const searchResults = await client.search({
    query: searchTerms,
    filter: { value: 'page', property: 'object' },
    page_size: 3
  });
  
  for (const result of searchResults.results) {
    if (result.object === 'page') {
      const text = await fetchPageText(result.id);
      if (text) sections.push(text);
    }
  }
}

// Step 3: Combine results up to token limit (3000 chars)
const context = formatSections(sections).slice(0, 3000);
```

**Subtask 69.3: Implement intent-based multi-page routing**

Create intent detection function:
```typescript
type Intent = keyof typeof NOTION_PAGES;

function detectIntent(message: string): string[] {
  const msg = message.toLowerCase();
  const pageIds: string[] = [];
  
  const intentMap: Record<Intent, string[]> = {
    pricing: ['precio', 'costo', 'cuanto', 'cuánto', 'pagar', 'quetzal', 'q.', 'mensual', 'plan'],
    schedules: ['horario', 'hora', 'clase', 'día', 'dias', 'cuando', 'cuándo'],
    courses: ['curso', 'nivel', 'a1', 'a2', 'b1', 'b2', 'c1', 'básico', 'basico', 'intermedio', 'avanzado'],
    requirements: ['inscripción', 'inscripcion', 'requisito', 'documento', 'empezar', 'necesito'],
    instructors: ['instructor', 'profesor', 'maestro', 'teacher'],
    certifications: ['certificado', 'certificación', 'diploma'],
    methodology: ['metodología', 'metodologia', 'cómo funciona', 'plataforma'],
    payment_policy: ['pago', 'cuota', 'forma de pago', 'deposito', 'transferencia']
  };
  
  // Check each intent, add up to 2 pages max per query
  let count = 0;
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (count >= 2) break;
    if (keywords.some(kw => msg.includes(kw))) {
      pageIds.push(NOTION_PAGES[intent as Intent]);
      count++;
    }
  }
  
  // Fallback: always include pricing if no intent matched
  if (pageIds.length === 0) {
    pageIds.push(NOTION_PAGES.pricing);
  }
  
  return pageIds;
}
```

**Subtask 69.4: Query Notion database for real-time availability**

Notion databases can be queried using the `@notionhq/client` database API. Implement:

```typescript
interface CourseAvailability {
  name: string;
  price: number;
  availableSlots: number;
  nextStartDate: string;
  modality: string;
  instructor?: string;
}

async function queryNotionDatabase(databaseId: string): Promise<CourseAvailability[]> {
  const client = getClient();
  if (!client) return [];
  
  const cacheKey = 'notion:courses:availability';
  const cached = await getJSON<CourseAvailability[]>(cacheKey);
  if (cached) {
    log('info', '[NotionRAG] Cache hit for course availability');
    return cached;
  }
  
  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Activo',
        checkbox: { equals: true }
      },
      sorts: [{
        property: 'Fecha Inicio',
        direction: 'ascending'
      }],
      page_size: 10
    });
    
    const courses: CourseAvailability[] = response.results.map((page: any) => ({
      name: page.properties['Nombre']?.title[0]?.plain_text || 'Sin nombre',
      price: page.properties['Precio']?.number || 0,
      availableSlots: page.properties['Cupos Disponibles']?.number || 0,
      nextStartDate: page.properties['Fecha Inicio']?.date?.start || '',
      modality: page.properties['Modalidad']?.select?.name || '',
      instructor: page.properties['Instructor']?.rich_text[0]?.plain_text
    }));
    
    await setJSON(cacheKey, courses, 1800); // 30 min TTL
    log('info', '[NotionRAG] Fetched and cached course availability', { count: courses.length });
    return courses;
  } catch (err) {
    log('error', '[NotionRAG] Error querying Notion database:', err);
    return [];
  }
}

// Integrate into getNotionContext:
if (msg.includes('disponible') || msg.includes('cuándo empieza') || msg.includes('cupo')) {
  const COURSES_DB_ID = 'YOUR_NOTION_DATABASE_ID'; // Add to env or constants
  const availability = await queryNotionDatabase(COURSES_DB_ID);
  if (availability.length > 0) {
    sections.push(formatCourseAvailability(availability));
  }
}
```

**Subtask 69.5: Increase context limit and improve formatting**

Replace flat text concatenation with structured sections:

```typescript
function formatSections(sections: string[]): string {
  // Group sections by type based on content markers
  const formatted: string[] = [];
  
  sections.forEach((section, idx) => {
    if (section.includes('Precio') || section.includes('Costo')) {
      formatted.push(`## Precios y Planes\n${section}`);
    } else if (section.includes('Horario') || section.includes('Hora')) {
      formatted.push(`## Horarios\n${section}`);
    } else if (section.includes('Curso') || section.includes('Nivel')) {
      formatted.push(`## Cursos Disponibles\n${section}`);
    } else if (section.includes('Instructor') || section.includes('Profesor')) {
      formatted.push(`## Instructores\n${section}`);
    } else {
      formatted.push(`## Información Adicional\n${section}`);
    }
  });
  
  return formatted.join('\n\n');
}

// Update context limit from 1500 to 3000 chars
const context = formatSections(sections).slice(0, 3000);
await setJSON(cacheKey, context, 3600);
return context;
```

**Subtask 69.6: Add logging and monitoring**

Instrument `getNotionContext` with detailed logs:

```typescript
export async function getNotionContext(userMessage: string): Promise<string> {
  const startTime = Date.now();
  const client = getClient();
  if (!client) {
    log('warn', '[NotionRAG] Notion client not available - missing NOTION_TOKEN');
    return '';
  }
  
  const msg = userMessage.toLowerCase();
  const cacheKey = `notion:context:${Buffer.from(msg).toString('base64').slice(0, 40)}`;
  
  // Check cache
  const cached = await getJSON<string>(cacheKey).catch(() => null);
  if (cached) {
    log('info', '[NotionRAG] Cache hit', { 
      messageLength: msg.length,
      contextLength: cached.length,
      duration: Date.now() - startTime
    });
    return cached;
  }
  
  log('info', '[NotionRAG] Cache miss - fetching from Notion', { messageLength: msg.length });
  
  const sections: string[] = [];
  const fetchedPages: string[] = [];
  
  try {
    // Intent-based page fetching
    const intentPages = detectIntent(msg);
    log('info', '[NotionRAG] Detected intents', { pageCount: intentPages.length });
    
    for (const pageId of intentPages) {
      const text = await fetchPageText(pageId);
      if (text) {
        sections.push(text);
        fetchedPages.push(pageId);
      }
    }
    
    // Additional search
    const searchTerms = extractSearchTerms(msg);
    if (searchTerms) {
      log('info', '[NotionRAG] Executing additional search', { terms: searchTerms });
      const searchResults = await client.search({
        query: searchTerms,
        filter: { value: 'page', property: 'object' },
        page_size: 3
      });
      
      for (const result of searchResults.results) {
        if (result.object === 'page') {
          const text = await fetchPageText(result.id);
          if (text) sections.push(text);
        }
      }
    }
    
    const context = formatSections(sections).slice(0, 3000);
    await setJSON(cacheKey, context, 3600);
    
    log('info', '[NotionRAG] Context generated successfully', {
      fetchedPages,
      sectionsCount: sections.length,
      contextLength: context.length,
      hadContext: context.length > 0,
      duration: Date.now() - startTime
    });
    
    return context;
  } catch (err) {
    log('error', '[NotionRAG] Error generating context:', err);
    return '';
  }
}
```

**Environment Variables Needed:**
- `NOTION_TOKEN` (already exists)
- `NOTION_COURSES_DATABASE_ID` (new - for real-time availability queries)

**Testing Strategy:**
Test queries that should trigger different intents:
1. "¿Cuánto cuesta el curso?" → Should fetch pricing page
2. "¿Qué horarios tienen?" → Should fetch schedules page  
3. "¿Cuándo empiezan las clases de inglés intermedio?" → Should fetch courses page + query database for availability
4. "¿Qué documentos necesito para inscribirme?" → Should fetch requirements page
5. "¿Quiénes son los profesores?" → Should fetch instructors page

Verify logs show:
- Cache hit/miss
- Pages fetched
- Context length sent to Claude
- Response time

**Success Criteria:**
- Lead asking "¿cuándo empiezan las clases de inglés intermedio?" receives actual start date from Notion
- Lead asking "¿qué documentos necesito para inscribirme?" receives exact requirements from MEA's Notion page
- Responses include context from multiple relevant pages (not just pricing)
- Additional search executes correctly when search terms present
- Context structured with clear section headers for Claude to reference
- All Notion API calls logged with cache hit/miss and timing info

**Test Strategy:**

**Unit Tests:**
1. Test `detectIntent()` with various Spanish queries:
   - Pricing queries: 'cuanto cuesta', 'precio del curso', 'planes disponibles'
   - Schedule queries: 'horarios de clase', 'que dias tienen', 'cuando son las clases'
   - Course queries: 'curso basico', 'nivel intermedio', 'clases de B1'
   - Verify correct page IDs returned

2. Test `extractSearchTerms()` filters stopwords and returns meaningful terms

3. Test `formatSections()` creates structured markdown with headers

4. Test `queryNotionDatabase()` cache behavior:
   - First call hits Notion API
   - Second call within 30 min returns cached data
   - Mock Notion API responses

**Integration Tests:**
1. Test complete flow in `getNotionContext()`:
   - Mock Notion client responses for pages and search
   - Mock Redis for cache
   - Verify sections combined correctly
   - Verify 3000 char limit enforced
   - Verify logs emitted with correct structure

2. Test bug fix: Verify additional search executes even when intent pages found

3. Test cache key generation for different messages

**Manual Testing (Staging Environment):**
1. Send WhatsApp messages to bot from test number:
   - "¿Cuánto cuesta el curso básico?"
   - "¿Qué horarios tienen disponibles?"
   - "¿Cuándo empiezan las clases de inglés intermedio?"
   - "¿Qué documentos necesito para inscribirme?"
   - "¿Quiénes son los instructores?"

2. Verify bot responses:
   - Include specific info from Notion pages (not generic responses)
   - Include real start dates from database when asked about availability
   - Include actual requirements when asked about enrollment

3. Check backend logs for:
   - `[NotionRAG]` prefix on all log lines
   - Cache hit/miss status
   - Pages fetched for each query
   - Context length sent to Claude
   - Response times under 2 seconds for cache hits, under 5 seconds for misses

4. Verify Redis cache:
   - Check keys exist: `notion:context:*` and `notion:courses:availability`
   - Verify TTLs: 3600s for context, 1800s for availability

**Acceptance Criteria:**
✅ Lead receives start date for "¿cuándo empiezan las clases de inglés intermedio?" from real Notion database
✅ Lead receives exact requirements for "¿qué documentos necesito?" from Notion requirements page
✅ Bot can answer questions about pricing, schedules, courses, instructors, methodology, requirements, certifications, and payment policy
✅ Additional Notion search executes correctly (bug fixed)
✅ Context includes up to 3000 chars with structured markdown sections
✅ All Notion interactions logged with cache status and timing
✅ Redis caching reduces Notion API calls (30 min TTL for context, 30 min for availability)
✅ No regression: existing pricing queries still work correctly

## Subtasks

### 69.1. Audit and map Notion pages to create NOTION_PAGES constant

**Status:** done  
**Dependencies:** None  

Navigate to each knowledge base page in Notion workspace and extract page IDs to create a constant mapping intents to page IDs for pricing, schedules, courses, instructors, methodology, requirements, certifications, FAQ, and payment policy.

**Details:**

In backend/src/lib/notion-context.ts, replace the single MEA_PRICING_PAGE_ID constant with a comprehensive NOTION_PAGES object. The structure should be:

const NOTION_PAGES = {
  pricing: '35d83de9-b32b-8001-bec4-edb3e3e4665c',
  schedules: 'PAGE_ID_HERE',
  courses: 'PAGE_ID_HERE',
  instructors: 'PAGE_ID_HERE',
  methodology: 'PAGE_ID_HERE',
  requirements: 'PAGE_ID_HERE',
  certifications: 'PAGE_ID_HERE',
  faq: 'PAGE_ID_HERE',
  payment_policy: 'PAGE_ID_HERE'
} as const;

Process: Navigate to each relevant page in MEA's Notion workspace → Copy the page ID from the browser URL (the long hash after the page title) → Verify the NOTION_TOKEN environment variable has read access by testing notion.pages.retrieve() for each page ID. Document any access issues. Keep the existing pricing page ID since it's already working.
<info added on 2026-05-19T05:33:32.587Z>
I'll analyze the codebase to understand the current implementation of the Notion RAG system and then provide the update based on your resolution.RESOLVED: Architecture changed from multi-page mapping to single-page knowledge base. The complete MEA knowledge base is consolidated in page ID 36183de9-b32b-8064-9456-c0d9ce8e942c, containing bot identity (Mía), pricing plans, schedules by group (niños/adolescentes/adultos), payment details (Banco Industrial Q693-001550-5), complete FAQ, and contact information. The NOTION_PAGES constant approach is no longer needed. Implementation updated in backend/src/lib/notion-context.ts using MEA_KB_PAGE_ID constant. Fixed code deployed to production. This subtask is obsolete as the single-page architecture eliminates the need for multi-page ID mapping.
</info added on 2026-05-19T05:33:32.587Z>

### 69.2. Fix search execution bug in getNotionContext function

**Status:** done  
**Dependencies:** 69.1  

Fix the conditional logic bug at line 78 that prevents additional Notion search from executing because the condition checks 'sections.length === 0' after the pricing page has already been added to sections.

**Details:**

In backend/src/lib/notion-context.ts, lines 78-90, the current code has a critical bug:

if (searchTerms && sections.length === 0) { // BUG: always false after pricing loads!
  const searchResults = await client.search(...);
}

This condition is always false because the pricing page is already added to sections[] before this check. Fix by:

1. Remove the 'sections.length === 0' check entirely
2. Change line 78 to: if (searchTerms) {
3. Keep the existing search logic (query: searchTerms, filter: { value: 'page', property: 'object' }, page_size: 2)
4. This allows search to execute independently, adding additional relevant pages beyond intent-based pages

The search should ALWAYS execute when search terms are present, regardless of how many sections have already been added by intent-based fetching.

### 69.3. Implement intent-based multi-page routing with detectIntent function

**Status:** done  
**Dependencies:** 69.1, 69.2  

Create an intent detection function that analyzes user messages in Spanish to identify which Notion pages are relevant, supporting up to 2 pages per query with fallback to pricing page.

**Details:**

In backend/src/lib/notion-context.ts, add a new function detectIntent(message: string): string[] that:

1. Converts message to lowercase
2. Defines an intentMap with Spanish keywords for each intent:
   - pricing: ['precio', 'costo', 'cuanto', 'cuánto', 'pagar', 'quetzal', 'q.', 'mensual', 'plan']
   - schedules: ['horario', 'hora', 'clase', 'día', 'dias', 'cuando', 'cuándo']
   - courses: ['curso', 'nivel', 'a1', 'a2', 'b1', 'b2', 'c1', 'básico', 'basico', 'intermedio', 'avanzado']
   - requirements: ['inscripción', 'inscripcion', 'requisito', 'documento', 'empezar', 'necesito']
   - instructors: ['instructor', 'profesor', 'maestro', 'teacher']
   - certifications: ['certificado', 'certificación', 'diploma']
   - methodology: ['metodología', 'metodologia', 'cómo funciona', 'plataforma']
   - payment_policy: ['pago', 'cuota', 'forma de pago', 'deposito', 'transferencia']
3. Checks each intent, adds up to 2 matching page IDs (break after 2)
4. Returns pricing page as fallback if no intents matched
5. Integrate into getNotionContext: replace lines 66-74 with intent-based fetching using detectIntent()

This replaces the hardcoded pricing keywords check with intelligent routing.

### 69.4. Query Notion database for real-time course availability

**Status:** cancelled  
**Dependencies:** 69.1, 69.2, 69.3  

Implement queryNotionDatabase function to fetch active courses with availability, pricing, start dates, and instructor info from a Notion database, with Redis caching (30 min TTL).

**Details:**

In backend/src/lib/notion-context.ts, create:

1. Interface CourseAvailability with fields: name, price, availableSlots, nextStartDate, modality, instructor?
2. Function async queryNotionDatabase(databaseId: string): Promise<CourseAvailability[]>
   - Check Redis cache first: 'notion:courses:availability'
   - If cache miss, query Notion: client.databases.query({ database_id: databaseId, filter: { property: 'Activo', checkbox: { equals: true }}, sorts: [{ property: 'Fecha Inicio', direction: 'ascending' }], page_size: 10 })
   - Map results to CourseAvailability, extracting properties: Nombre (title), Precio (number), Cupos Disponibles (number), Fecha Inicio (date), Modalidad (select), Instructor (rich_text)
   - Cache results with 30 min TTL (1800s)
   - Return empty array on error
3. Add environment variable NOTION_COURSES_DATABASE_ID to .env.example
4. Integrate into getNotionContext: if message includes 'disponible', 'cuándo empieza', or 'cupo', call queryNotionDatabase and format results into sections
5. Create helper formatCourseAvailability(courses: CourseAvailability[]): string to format course data

### 69.5. Increase context limit and implement structured section formatting

**Status:** done  
**Dependencies:** 69.1, 69.2, 69.3, 69.4  

Replace flat text concatenation with structured markdown sections, increase context limit from 1500 to 3000 characters, and implement section type detection for better Claude comprehension.

**Details:**

In backend/src/lib/notion-context.ts:

1. Create function formatSections(sections: string[]): string that:
   - Analyzes each section content to detect type (contains 'Precio'/'Costo' → '## Precios y Planes', contains 'Horario'/'Hora' → '## Horarios', contains 'Curso'/'Nivel' → '## Cursos Disponibles', contains 'Instructor'/'Profesor' → '## Instructores', else → '## Información Adicional')
   - Adds markdown headers to each section based on detected type
   - Joins sections with double newlines for clear separation
2. Update line 96: change .slice(0, 1500) to .slice(0, 3000)
3. Replace line 96: const context = sections.join('\n\n').slice(0, 1500); with: const context = formatSections(sections).slice(0, 3000);
4. Update fetchPageText line 49: increase from 1200 to 2000 chars per page to support longer pages

This provides Claude with clearly structured context instead of unformatted text blobs.

### 69.6. Add comprehensive logging and monitoring to getNotionContext

**Status:** done  
**Dependencies:** 69.1, 69.2, 69.3, 69.4, 69.5  

Instrument getNotionContext with detailed logging for cache hits/misses, page fetches, search execution, context generation, and timing metrics to enable monitoring and debugging of the RAG system.

**Details:**

In backend/src/lib/notion-context.ts, enhance getNotionContext with:

1. Add const startTime = Date.now() at function start
2. Log when client unavailable: log('warn', '[NotionRAG] Notion client not available - missing NOTION_TOKEN')
3. Log cache hit with metrics: log('info', '[NotionRAG] Cache hit', { messageLength: msg.length, contextLength: cached.length, duration: Date.now() - startTime })
4. Log cache miss: log('info', '[NotionRAG] Cache miss - fetching from Notion', { messageLength: msg.length })
5. Log detected intents: log('info', '[NotionRAG] Detected intents', { pageCount: intentPages.length })
6. Track fetched pages in array: const fetchedPages: string[] = []; push pageId when successfully fetched
7. Log search execution: log('info', '[NotionRAG] Executing additional search', { terms: searchTerms })
8. Log final success: log('info', '[NotionRAG] Context generated successfully', { fetchedPages, sectionsCount: sections.length, contextLength: context.length, hadContext: context.length > 0, duration: Date.now() - startTime })
9. Enhance error logging at line 92: include duration and message details
10. Add similar logging to queryNotionDatabase for cache hits and database query execution
