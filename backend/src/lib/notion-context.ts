import { Client, isFullBlock } from "@notionhq/client";
import { getJSON, setJSON } from "./redis";
import { log } from "./logger";

// IDs de páginas clave de MEA International en Notion
const MEA_PRICING_PAGE_ID = "35d83de9-b32b-8001-bec4-edb3e3e4665c";

let notion: Client | null = null;

function getClient(): Client | null {
  if (!process.env.NOTION_TOKEN) return null;
  if (!notion) notion = new Client({ auth: process.env.NOTION_TOKEN });
  return notion;
}

async function fetchPageText(pageId: string): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const blocks = await client.blocks.children.list({ block_id: pageId, page_size: 50 });
  const lines: string[] = [];

  for (const block of blocks.results) {
    if (!isFullBlock(block)) continue;

    const type = block.type as string;
    const blockAny = block as Record<string, unknown>;
    const content = blockAny[type] as Record<string, unknown> | undefined;

    if (!content) continue;

    // Extraer texto de rich_text
    if (Array.isArray(content["rich_text"])) {
      const text = (content["rich_text"] as Array<{ plain_text: string }>)
        .map((t) => t.plain_text)
        .join("");
      if (text.trim()) lines.push(text.trim());
    }

    // Extraer celdas de tablas
    if (type === "table_row" && Array.isArray(content["cells"])) {
      const cells = (content["cells"] as Array<Array<{ plain_text: string }>>)
        .map((cell) => cell.map((t) => t.plain_text).join(""))
        .filter(Boolean);
      if (cells.length) lines.push(cells.join(" | "));
    }
  }

  return lines.join("\n").slice(0, 1200);
}

export async function getNotionContext(userMessage: string): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const msg = userMessage.toLowerCase();
  const cacheKey = `notion:context:${Buffer.from(msg).toString("base64").slice(0, 40)}`;

  // Cache hit
  const cached = await getJSON<string>(cacheKey).catch(() => null);
  if (cached) return cached;

  const sections: string[] = [];

  try {
    // Siempre incluir precios si el usuario pregunta por costos, inscripción o cursos
    const pricingKeywords = ["precio", "costo", "cuanto", "cuánto", "inscripcion", "inscripción",
      "curso", "plan", "vip", "mensual", "mes", "pagar", "quetzal", "q.", "básico", "basico",
      "intermedio", "avanzado", "modalidad", "clase", "english", "inglés", "ingles"];

    if (pricingKeywords.some((kw) => msg.includes(kw)) || sections.length === 0) {
      const pricingText = await fetchPageText(MEA_PRICING_PAGE_ID);
      if (pricingText) sections.push(`--- Precios y Planes MEA ---\n${pricingText}`);
    }

    // Búsqueda adicional en Notion si hay términos específicos
    const searchTerms = extractSearchTerms(msg);
    if (searchTerms && sections.length === 0) {
      const searchResults = await client.search({
        query: searchTerms,
        filter: { value: "page", property: "object" },
        page_size: 2,
      });

      for (const result of searchResults.results) {
        if (result.object !== "page") continue;
        const text = await fetchPageText(result.id);
        if (text) sections.push(text);
      }
    }
  } catch (err) {
    log("error", "[Notion] Error obteniendo contexto:", err);
    return "";
  }

  const context = sections.join("\n\n").slice(0, 1500);
  await setJSON(cacheKey, context, 3600).catch(() => null);
  return context;
}

function extractSearchTerms(message: string): string {
  const stopWords = new Set(["el", "la", "los", "las", "un", "una", "de", "en", "que", "y",
    "me", "mi", "tu", "es", "se", "por", "con", "para", "como", "hola", "buenas", "quiero",
    "necesito", "puedo", "puede", "tienes", "tiene", "hay"]);

  return message
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 4)
    .join(" ");
}
