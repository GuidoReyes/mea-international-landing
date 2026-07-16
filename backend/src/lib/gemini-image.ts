import { log } from "./logger";

// imagen-4.0-generate-001 (endpoint :predict) fue retirado para cuentas
// nuevas — Google migró la generación de imágenes al modelo multimodal
// "Nano Banana" vía el endpoint clásico :generateContent.
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

export function isGeminiConfigurado(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

interface ParteRespuesta {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface RespuestaGeminiGenerateContent {
  candidates?: { content?: { parts?: ParteRespuesta[] } }[];
}

// Genera una ilustración 100% con IA a partir de una frase corta en inglés
// (ej. "person waving hello"). Nunca es una foto real de una persona real:
// evita cualquier riesgo de derechos de autor/imagen de terceros. El caller
// (generate-leccion.ts) cachea el resultado en R2 para no regenerar la misma
// palabra dos veces.
export async function generarImagenGemini(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const promptIlustracion = `Simple friendly flat-illustration, colorful, widescreen 16:9, no text or letters anywhere in the image, clean background: ${prompt}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptIlustracion }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Gemini respondió ${res.status}: ${detalle}`);
  }

  const data = (await res.json()) as RespuestaGeminiGenerateContent;
  const parte = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!parte?.inlineData?.data) {
    log("warn", "[GeminiImage] La respuesta no trajo ninguna imagen", data);
    throw new Error("Gemini no devolvió ninguna imagen");
  }

  return Buffer.from(parte.inlineData.data, "base64");
}
