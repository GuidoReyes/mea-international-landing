# Task ID: 9

**Title:** Create Notion RAG Context Retrieval Function

**Status:** done

**Dependencies:** 1 ✓

**Priority:** medium

**Description:** Implement function to search Notion pages for relevant course information based on user query using Notion API.

**Details:**

Install @notionhq/client: `npm install @notionhq/client`. Create `src/lib/notion-context.ts`. Initialize Notion client with auth token from NOTION_TOKEN env var. Implement async getNotionContext(userMessage: string): Promise<string> function. Use Notion search API with query extracted from userMessage (simple keyword extraction - look for course names, 'precio', 'modalidad', 'fecha', etc.). Query specific database IDs or pages configured in env (NOTION_DATABASE_IDS comma-separated). Retrieve page content (title, properties, rich_text blocks). Format results as plain text context string (max 1000 chars to fit in Claude prompt). Handle API errors gracefully - return empty string if Notion fails. Cache frequent queries in Redis with 1h TTL to reduce API calls.

**Test Strategy:**

Add test Notion pages with course info. Test getNotionContext with queries like 'curso de programación', 'precios', 'modalidad online'. Verify returns relevant formatted text. Test with non-existent query (should return empty or generic). Test cache hit on second identical query. Verify works without NOTION_TOKEN (should gracefully skip).
