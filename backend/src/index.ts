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

app.listen(PORT, () => {
  console.log(`MEA Backend corriendo en puerto ${PORT}`);
});

export default app;
