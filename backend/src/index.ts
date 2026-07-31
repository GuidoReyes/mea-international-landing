import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cursosRouter from "./routes/cursos";
import cursosOnlineRouter from "./routes/cursos-online";
import planesRouter from "./routes/planes";
import rutasRouter from "./routes/rutas";
import clasesEnVivoRouter from "./routes/clases-en-vivo";
import leccionesRouter from "./routes/lecciones";
import suscripcionesRouter from "./routes/suscripciones";
import pagosDepositoRouter from "./routes/pagos-deposito";
import certificadosOnlineRouter from "./routes/certificados-online";
import webhooksRecurrenteRouter from "./routes/webhooks-recurrente";
import leadsRouter from "./routes/leads";
import whatsappWebhookRouter from "./routes/whatsapp.webhook";
import authRouter from "./routes/auth";
import authAlumnoRouter from "./routes/auth-alumno";
import alumnosRouter from "./routes/alumnos";
import pagosRouter from "./routes/pagos";
import cuotasRouter from "./routes/cuotas";
import crmRouter from "./routes/crm";
import edicionesRouter from "./routes/ediciones";
import inscripcionesRouter from "./routes/inscripciones";
import reportesRouter from "./routes/reportes";
import certificadosRouter from "./routes/certificados";
import finanzasRouter from "./routes/finanzas";
import marketingRouter from "./routes/marketing";
import twilioWebhookRouter from "./routes/twilio.webhook";
import securityRouter from "./routes/security.routes";
import backupRouter from "./routes/backup.routes";
import jarvisBridgeRouter from "./routes/jarvis-bridge";
import { startScheduler } from "./scheduler";
import { startBackupScheduler } from "./backup/scheduler";

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 4000;

// Detrás del proxy de Railway: sin esto req.ip es la IP del proxy y el
// rate-limit del login contaría a todos los clientes como uno solo.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    // Con credentials, cors echa el origin exacto (no se permite "*").
    // Se filtra el "" para que un FRONTEND_URL sin setear no habilite
    // requests sin header Origin.
    origin: [
      process.env.FRONTEND_URL,
      "https://www.mea.edu.gt",
      "http://localhost:3000",
    ].filter((o): o is string => Boolean(o)),
    credentials: true,
  })
);
app.use(cookieParser());

// Twilio envía form-urlencoded — montar ANTES del json parser y del router Twilio
app.use("/api/twilio/webhook", express.urlencoded({ extended: false }), twilioWebhookRouter);

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

app.use("/api/auth/alumno", authAlumnoRouter);
app.use("/api/auth", authRouter);
app.use("/api/cursos", cursosRouter);
app.use("/api/cursos-online", cursosOnlineRouter);
app.use("/api/planes", planesRouter);
app.use("/api/rutas", rutasRouter);
app.use("/api/clases-en-vivo", clasesEnVivoRouter);
app.use("/api/lecciones", leccionesRouter);
app.use("/api/suscripciones", suscripcionesRouter);
app.use("/api/pagos-deposito", pagosDepositoRouter);
app.use("/api/certificados-online", certificadosOnlineRouter);
app.use("/api/webhooks/recurrente", webhooksRecurrenteRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/meta/webhook", whatsappWebhookRouter);
app.use("/api/alumnos", alumnosRouter);
app.use("/api/pagos", pagosRouter);
app.use("/api/cuotas", cuotasRouter);
app.use("/api/crm", crmRouter);
app.use("/api/ediciones", edicionesRouter);
app.use("/api/inscripciones", inscripcionesRouter);
app.use("/api/reportes", reportesRouter);
app.use("/api/certificados", certificadosRouter);
app.use("/api/finanzas", finanzasRouter);
app.use("/api/marketing", marketingRouter);
// Bridge de solo lectura para JARVIS (token interno X-Jarvis-Token)
app.use("/api/jarvis", jarvisBridgeRouter);

// Security dashboard + backup (protected by X-Security-Key middleware)
app.use(securityRouter);
app.use(backupRouter);

// Endpoint temporal de prueba — remover antes de producción real.
// Protegido con la key del security dashboard: envía WhatsApp REAL y gasta
// tokens de Anthropic, así que aunque el flag quede activo por accidente
// nadie sin la key puede usarlo.
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_ENDPOINT === "true") {
  const { responderMensaje } = require("./lib/claude");
  const { guardarMensajes } = require("./lib/persistence");
  const { sendWhatsAppMessage } = require("./lib/whatsapp-send");
  const { securityKeyMiddleware } = require("./security-agent/middleware");

  app.post("/api/test-bot", securityKeyMiddleware, async (req: Request, res: Response) => {
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
  if (process.env.NODE_ENV !== "production") console.log(`MEA Backend corriendo en puerto ${PORT}`);
  startScheduler();
  startBackupScheduler();
});

export default app;
