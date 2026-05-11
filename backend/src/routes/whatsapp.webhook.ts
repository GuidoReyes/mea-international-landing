import { Router, Request, Response } from "express";
import { verifyMetaHmac } from "../middleware/hmac.middleware";

const router = Router();

interface MetaMessage {
  from: string;
  text?: { body: string };
  type: string;
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: MetaMessage[];
      };
    }>;
  }>;
}

async function handleWhatsAppMessage(phone: string, text: string) {
  console.log(`[WhatsApp] Mensaje de ${phone}: ${text}`);
  // Placeholder — se integrará con Claude AI en Task 10
}

// GET — verificación de webhook por Meta
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verificado por Meta");
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: "Verificación fallida" });
});

// POST — recibir mensajes de WhatsApp
router.post("/", verifyMetaHmac, async (req: Request, res: Response) => {
  // Siempre responder 200 a Meta inmediatamente
  res.status(200).send("OK");

  try {
    const body = req.body as MetaWebhookBody;
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages?.length) return;

    for (const msg of messages) {
      if (msg.type === "text" && msg.text?.body) {
        await handleWhatsAppMessage(msg.from, msg.text.body);
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Error procesando webhook:", err);
  }
});

export default router;
