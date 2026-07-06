import Anthropic from "@anthropic-ai/sdk";
import { getJSON, setJSON, CHAT_HISTORY_TTL } from "./redis";
import { getNotionContext } from "./notion-context";
import { log } from "./logger";
import prisma from "./prisma";
import { selectAgent } from "../agents/agentRouter";
import { estaModoHumano, activarModoHumano } from "./human-handoff";
import { sendTemplateMessage } from "./whatsapp-send";
import { sendTwilioWhatsApp } from "./twilio-send";
import { detectIntent, notifyAdvisorIfNeeded } from "./advisor-notify";

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

  // Proactive advisor notification based on user intent
  const intent = detectIntent(mensaje);
  notifyAdvisorIfNeeded(telefono, mensaje, intent).catch(() => null);

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

  // System en bloques para prompt caching: el bloque 1 (prompt de la etapa +
  // WEB_CONTEXT + instrucción de escalación) es idéntico entre llamadas y se
  // cachea en Anthropic (~90% menos costo de input en hits, TTL 5 min). El KB
  // de Notion varía por mensaje, así que va en un bloque aparte SIN cache —
  // su propio encabezado ya le dice a Claude que lo consulte antes de escalar,
  // por lo que el orden bloque-final no cambia el comportamiento.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: agentConfig.systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (notionCtx) {
    systemBlocks.push({
      type: "text",
      text: `BASE DE CONOCIMIENTO OFICIAL MEA (consulta esto ANTES de escalar — tiene prioridad sobre cualquier otra fuente):\n${notionCtx}`,
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    system: systemBlocks,
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

        const asesorPhone  = process.env.MIRCE_PERSONAL_PHONE;
        const adminTwilio  = process.env.ADMIN_TWILIO_WHATSAPP;
        const motivo       = parsed.motivo ?? "sin motivo";
        const mask         = `XXX-${telefono.slice(-4)}`;

        // Persistir escalación en BD
        prisma.escalacionLog.create({
          data: { telefono, motivo },
        }).catch((err: unknown) => log("error", "[Claude] Error guardando EscalacionLog:", err));

        // Canal Meta: notificación al asesor por PLANTILLA aprobada — el texto
        // libre solo llega si el asesor escribió al bot en las últimas 24h
        // (ventana de Meta, error 131047); la plantilla llega siempre.
        if (asesorPhone) {
          const template = process.env.WHATSAPP_TEMPLATE_ESCALACION ?? "escalacion_asesor";
          // Meta rechaza parámetros con saltos de línea o demasiado largos
          const motivoParam = motivo.replace(/\s+/g, " ").trim().slice(0, 300) || "sin motivo";
          sendTemplateMessage(asesorPhone, template, [`+${telefono}`, motivoParam])
            .then((sent) => {
              if (!sent.success) {
                log("error", `[Claude] Plantilla de escalación falló para ${mask}: ${sent.error}`);
              }
            })
            .catch((err) => log("error", `[Claude] Error notificando escalación (Meta): ${mask}`, err));
        }

        // Canal Twilio: formato con reply para responder desde WhatsApp personal
        if (adminTwilio) {
          sendTwilioWhatsApp(
            adminTwilio,
            `🔔 *Escalación requerida*\n📱 [+${telefono}]\n💬 Motivo: ${motivo}\n\nPara responder:\n\`[+${telefono}] Tu respuesta\`\nPara reactivar bot:\n\`/bot [+${telefono}]\``
          ).catch((err) => log("error", `[Claude] Error notificando escalación (Twilio): ${mask}`, err));
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
