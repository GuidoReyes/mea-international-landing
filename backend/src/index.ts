import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import cursosRouter from "./routes/cursos";
import leadsRouter from "./routes/leads";
import whatsappWebhookRouter from "./routes/whatsapp.webhook";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(
  cors({
    origin: [process.env.FRONTEND_URL ?? "", "http://localhost:3000"],
  })
);

// Capturar raw body para HMAC antes de parsear JSON
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/cursos", cursosRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/meta/webhook", whatsappWebhookRouter);

// Endpoint temporal de prueba — remover antes de producción real
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_ENDPOINT === "true") {
  const { responderMensaje } = require("./lib/claude");
  const { guardarMensajes } = require("./lib/persistence");
  const { sendWhatsAppMessage } = require("./lib/whatsapp-send");

  app.post("/api/test-bot", async (req: Request, res: Response) => {
    const { telefono, mensaje } = req.body as { telefono?: string; mensaje?: string };
    if (!telefono || !mensaje) {
      res.status(400).json({ error: "Se requiere telefono y mensaje" });
      return;
    }
    try {
      const respuesta = await responderMensaje(telefono, mensaje);
      await guardarMensajes(telefono, mensaje, respuesta);
      const sent = await sendWhatsAppMessage(telefono, respuesta);
      res.json({ respuesta, enviado: sent.success, messageId: sent.messageId, error: sent.error });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}

app.listen(PORT, () => {
  console.log(`MEA Backend corriendo en puerto ${PORT}`);
});

export default app;
