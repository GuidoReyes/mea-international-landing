import Anthropic from "@anthropic-ai/sdk";
import { getJSON, setJSON, CHAT_HISTORY_TTL } from "./redis";
import { getNotionContext } from "./notion-context";
import { log } from "./logger";
import prisma from "./prisma";
import { selectAgent } from "../agents/agentRouter";
import { estaModoHumano, activarModoHumano } from "./human-handoff";
import { sendWhatsAppMessage } from "./whatsapp-send";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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
  // 55.6: Bot silenced — human asesor is handling this conversation
  if (await estaModoHumano(telefono)) {
    return "";
  }

  const history = await getHistory(telefono);
  history.push({ role: "user", content: mensaje });

  const notionCtx = await getNotionContext(mensaje).catch(() => "");

  // Fetch lead with etapa and last message timestamp for agent selection
  const lead = await prisma.lead.findUnique({
    where: { telefono },
    include: {
      etapa: { select: { nombre: true } },
      conversaciones: {
        include: {
          mensajes: { orderBy: { creadoEn: "desc" }, take: 1 },
        },
        orderBy: { creadoEn: "desc" },
        take: 1,
      },
    },
  }).catch(() => null);

  const lastMessageAt = lead?.conversaciones?.[0]?.mensajes?.[0]?.creadoEn ?? null;

  const agentConfig = selectAgent(
    lead
      ? {
          nombre: lead.nombre,
          creadoEn: lead.creadoEn,
          etapa: lead.etapa,
          lastMessageAt,
        }
      : null
  );

  const systemPrompt = `${agentConfig.systemPrompt}${notionCtx ? `\n\nINFORMACIÓN ADICIONAL:\n${notionCtx}` : ""}`.trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    system: systemPrompt,
    messages: history.slice(-10),
  });

  const firstContent = response.content[0];
  if (firstContent.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }
  const responseText = firstContent.text;

  // 55.5: Detect escalation signal {"accion": "escalar_humano", "motivo": "..."}
  const trimmed = responseText.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { accion?: string; motivo?: string };
      if (parsed.accion === "escalar_humano") {
        await activarModoHumano(telefono);
        log("info", `[Claude] Escalación a humano — motivo: ${parsed.motivo ?? "sin motivo"}`);

        const asesorPhone = process.env.MIRCE_PERSONAL_PHONE;
        if (asesorPhone) {
          const mask = `XXX-${telefono.slice(-4)}`;
          sendWhatsAppMessage(
            asesorPhone,
            `🔔 Escalación requerida\n📱 +${telefono}\n💬 Motivo: ${parsed.motivo ?? "sin motivo"}\n\nResponde directamente a este número. Envía /bot al bot para reactivarlo cuando termines.`
          ).catch((err) => log("error", `[Claude] Error notificando escalación a asesor: ${mask}`, err));
        }

        const userMsg = "Un momento, voy a conectarte con uno de nuestros asesores. 🙏 Te contactarán pronto por este mismo chat.";
        history.push({ role: "assistant", content: userMsg });
        await saveHistory(telefono, history);
        return userMsg;
      }
    } catch {
      // Not valid JSON — proceed with normal response
    }
  }

  history.push({ role: "assistant", content: responseText });
  await saveHistory(telefono, history);

  return responseText;
}
