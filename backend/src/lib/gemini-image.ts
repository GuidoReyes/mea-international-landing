import { log } from "./logger";

// gemini-3.1-flash-image ("Nano Banana 2", GA feb 2026) vía la Interactions
// API — endpoint recomendado actual de Google para generación de imágenes.
// Configurable por env var para poder subir a gemini-3-pro-image (más
// calidad/consistencia de referencia) sin tocar código.
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export function isGeminiConfigurado(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ─── Art direction: fotos realistas de personas ficticias generadas por IA ───
// Mismas reglas visuales para TODAS las fotos de la plataforma, para que el
// catálogo se vea coherente aunque se generen en sesiones distintas.
// CRÍTICO: "realista" NO es lo mismo que "foto de una persona real". Sigue
// siendo una persona 100% ficticia/sintética — eso es lo que evita cualquier
// riesgo de derechos de autor o de imagen de un tercero real.
export function buildImagePrompt(concept: string): string {
  return `
Photorealistic photograph of: ${concept}.
Real-looking human subject, natural skin texture, natural lighting, candid everyday moment — shot like a
genuine lifestyle/stock photograph, NOT an illustration, NOT a cartoon, NOT a vector drawing, NOT 3D render.
Warm, friendly, everyday setting appropriate to a language-learning app. Natural colors, soft depth of field,
subject in sharp focus, clean uncluttered background. No text, no logos, no watermarks in the image.
CRITICAL — the person must be entirely fictional/synthetic, invented by you: do NOT depict any real, named,
identifiable, or famous individual, and do NOT copy any existing photograph. A completely original, generated
person only. Do NOT depict Duolingo's owl mascot or any Duolingo character.
`.trim();
}

interface ContenidoInteraction {
  type?: string;
  data?: string;
  mime_type?: string;
}

interface StepInteraction {
  type?: string;
  content?: ContenidoInteraction[];
}

interface RespuestaInteractions {
  output_image?: { data?: string; mime_type?: string };
  steps?: StepInteraction[];
}

function extraerImagenBase64(data: RespuestaInteractions): string | undefined {
  // Caso simple: la mayoría de las llamadas de un solo turno traen esta
  // propiedad de conveniencia directo en la raíz.
  if (data.output_image?.data) return data.output_image.data;

  // Caso interleaved: hay que iterar los steps y buscar el bloque de imagen
  // dentro de content — no asumir posición fija (así lo documenta Google).
  for (const step of data.steps ?? []) {
    const bloqueImagen = step.content?.find((c) => c.type === "image" && c.data);
    if (bloqueImagen?.data) return bloqueImagen.data;
  }
  return undefined;
}

// Genera una ilustración 100% con IA a partir de un concepto corto en inglés
// (ej. "person waving hello"). Nunca es una foto real de una persona real:
// evita cualquier riesgo de derechos de autor/imagen de terceros. El caller
// (imagen-vocabulario.ts) cachea el resultado en R2 para no regenerar el
// mismo concepto dos veces.
export async function generarImagenGemini(concepto: string, refImagesB64: string[] = []): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const input: Array<{ type: string; text?: string; mime_type?: string; data?: string }> = [
    { type: "text", text: buildImagePrompt(concepto) },
  ];
  // Referencias opcionales: SOLO para que un personaje/mascota recurrente se
  // vea igual entre lecciones — no es transferencia de estilo genérica.
  for (const b64 of refImagesB64) {
    input.push({ type: "image", mime_type: "image/png", data: b64 });
  }

  const res = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: GEMINI_IMAGE_MODEL,
      input,
      response_format: { type: "image", aspect_ratio: "16:9", image_size: "1K" },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Gemini Interactions API respondió ${res.status}: ${detalle}`);
  }

  const data = (await res.json()) as RespuestaInteractions;
  const bytesBase64 = extraerImagenBase64(data);
  if (!bytesBase64) {
    log("warn", "[GeminiImage] La respuesta no trajo ninguna imagen", data);
    throw new Error("Gemini no devolvió ninguna imagen");
  }

  return Buffer.from(bytesBase64, "base64");
}
