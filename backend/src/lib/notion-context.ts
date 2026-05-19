import { Client, isFullBlock } from "@notionhq/client";
import { getJSON, setJSON } from "./redis";
import { log } from "./logger";

// Base de Conocimiento principal del bot — contiene identidad, planes, horarios, pagos y FAQ
const MEA_KB_PAGE_ID = "36183de9-b32b-8064-9456-c0d9ce8e942c";

let notion: Client | null = null;

function getClient(): Client | null {
  if (!process.env.NOTION_TOKEN) return null;
  if (!notion) notion = new Client({ auth: process.env.NOTION_TOKEN });
  return notion;
}

async function fetchPageText(pageId: string): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const blocks = await client.blocks.children.list({ block_id: pageId, page_size: 100 });
  const lines: string[] = [];

  for (const block of blocks.results) {
    if (!isFullBlock(block)) continue;

    const type = block.type as string;
    const blockAny = block as Record<string, unknown>;
    const content = blockAny[type] as Record<string, unknown> | undefined;

    if (!content) continue;

    if (Array.isArray(content["rich_text"])) {
      const text = (content["rich_text"] as Array<{ plain_text: string }>)
        .map((t) => t.plain_text)
        .join("");
      if (text.trim()) lines.push(text.trim());
    }

    if (type === "table_row" && Array.isArray(content["cells"])) {
      const cells = (content["cells"] as Array<Array<{ plain_text: string }>>)
        .map((cell) => cell.map((t) => t.plain_text).join(""))
        .filter(Boolean);
      if (cells.length) lines.push(cells.join(" | "));
    }
  }

  return lines.join("\n").slice(0, 5000);
}

export async function getNotionContext(userMessage: string): Promise<string> {
  const startTime = Date.now();
  const client = getClient();
  if (!client) {
    log("warn", "[NotionRAG] NOTION_TOKEN no configurado — sin contexto");
    return "";
  }

  const msg = userMessage.toLowerCase();
  // Cache por mensaje — TTL 1h
  const cacheKey = `notion:kb:${Buffer.from(msg).toString("base64").slice(0, 40)}`;

  const cached = await getJSON<string>(cacheKey).catch(() => null);
  if (cached) {
    log("info", `[NotionRAG] Cache hit (${cached.length} chars, ${Date.now() - startTime}ms)`);
    return cached;
  }

  try {
    // Toda la base de conocimiento está en una sola página — siempre la cargamos completa
    const kbText = await fetchPageText(MEA_KB_PAGE_ID);

    if (!kbText) {
      log("warn", "[NotionRAG] Página KB vacía o sin acceso");
      return "";
    }

    const context = `--- Base de Conocimiento MEA International ---\n${kbText}`.slice(0, 5000);
    await setJSON(cacheKey, context, 3600).catch(() => null);

    log("info", `[NotionRAG] Contexto generado (${context.length} chars, ${Date.now() - startTime}ms)`);
    return context;
  } catch (err) {
    log("error", "[NotionRAG] Error obteniendo contexto:", err);
    return "";
  }
}
