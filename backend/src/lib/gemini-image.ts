import { log } from "./logger";

const GEMINI_IMAGE_MODEL = "imagen-4.0-generate-001";

export function isGeminiConfigurado(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

interface PrediccionImagen {
  bytesBase64Encoded?: string;
  mimeType?: string;
}

interface RespuestaGeminiImagen {
  predictions?: PrediccionImagen[];
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

  const promptIlustracion = `Simple friendly flat-illustration, colorful, no text or letters anywhere in the image, clean background: ${prompt}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: promptIlustracion }],
        parameters: { sampleCount: 1, aspectRatio: "16:9" },
      }),
    }
  );

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Gemini Imagen respondió ${res.status}: ${detalle}`);
  }

  const data = (await res.json()) as RespuestaGeminiImagen;
  const bytesBase64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!bytesBase64) {
    log("warn", "[GeminiImage] La respuesta no trajo ninguna imagen", data);
    throw new Error("Gemini Imagen no devolvió ninguna imagen");
  }

  return Buffer.from(bytesBase64, "base64");
}
