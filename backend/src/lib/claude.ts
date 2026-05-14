import Anthropic from "@anthropic-ai/sdk";
import { getJSON, setJSON, CHAT_HISTORY_TTL } from "./redis";
import { getNotionContext } from "./notion-context";
import { log } from "./logger";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WEB_CONTEXT = `
MEA International es una academia premium de inglés online enfocada en Guatemala y Latinoamérica.
Clases en vivo por Zoom/Google Meet con maestros certificados.

PLANES Y PRECIOS (en Quetzales):
- Inscripción: Q100 (pago único, una sola vez)
- Plataforma educativa: Q130 (acceso digital, pago único)
- Inglés Pre A (básico): Q300/mes → 8 clases al mes, 2 por semana, grupales
- Inglés Intermedio-Avanzado B1-B2 (conversacional): Q250/mes → 8 clases al mes, 2 por semana, grupales. EL MÁS POPULAR.
- VIP / Personalizado 1 a 1: Q1,600/mes → clases privadas, horario 100% flexible, plan a medida

INCLUIDO EN TODOS LOS PLANES:
- Material digital
- Acceso a clases grabadas
- Soporte por WhatsApp
- Certificado de nivel
- Sin contratos ni compromisos mínimos (podés cancelar cuando quieras)
- Oferta de grupo familiar disponible

PROGRAMAS ESPECIALIZADOS: inglés médico, inglés legal, preparación TOEFL.

HORARIOS: flexibles de 6am a 9pm, adaptados al horario del estudiante.

INSCRIPCIÓN Y CONTACTO: todo por WhatsApp al +502 5631-1728 o en mea.edu.gt
`.trim();

async function getHistory(telefono: string): Promise<Message[]> {
  try {
    const history = await getJSON<Message[]>(`chat:${telefono}`);
    return history ?? [];
  } catch {
    return [];
  }
}

async function saveHistory(telefono: string, history: Message[]): Promise<void> {
  try {
    await setJSON(`chat:${telefono}`, history, CHAT_HISTORY_TTL);
  } catch (err) {
    log("error", "[Claude] Error guardando historial:", err);
  }
}

export async function responderMensaje(telefono: string, mensaje: string): Promise<string> {
  const history = await getHistory(telefono);
  history.push({ role: "user", content: mensaje });

  const notionCtx = await getNotionContext(mensaje).catch(() => "");

  const systemPrompt = `Eres el asistente virtual de MEA International, una academia de inglés online premium en Guatemala.
Respondés en español, de forma amable, natural y concisa (máximo 3 párrafos cortos).
Si no sabés algo con certeza, decí que un asesor se pondrá en contacto pronto.
No inventés precios ni fechas que no estén en el contexto proporcionado.
Cuando sea relevante, animá al usuario a inscribirse o a consultar más por WhatsApp.

INFORMACIÓN DE MEA INTERNATIONAL:
${WEB_CONTEXT}

${notionCtx ? `INFORMACIÓN ADICIONAL:\n${notionCtx}` : ""}`.trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages: history.slice(-10),
  });

  const firstContent = response.content[0];
  if (firstContent.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }
  const responseText = firstContent.text;

  history.push({ role: "assistant", content: responseText });
  await saveHistory(telefono, history);

  return responseText;
}
