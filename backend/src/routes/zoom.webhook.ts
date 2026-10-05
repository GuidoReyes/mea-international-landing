import { Router, Request, Response } from "express";
import { createHmac } from "crypto";
import { log } from "../lib/logger";
import { safeEqual } from "../lib/safe-equal";
import { requireRawBody } from "../middleware/raw-body.middleware";

const router = Router();

// Zoom exige que el endpoint responda la verificacion CRC antes de dejar
// guardar la URL en el Marketplace, y vuelve a mandarla periodicamente para
// confirmar que el endpoint sigue vivo. https://developers.zoom.us/docs/api/webhooks/#verify-with-a-challenge-response-check-crc
interface ZoomUrlValidationEvent {
  event: "endpoint.url_validation";
  payload: { plainToken: string };
}

interface ZoomParticipantEvent {
  event: "meeting.participant_joined" | "meeting.participant_left";
  payload: {
    object: {
      id: string; // meeting id
      topic?: string;
      participant: {
        user_name?: string;
        email?: string;
        join_time?: string;
        leave_time?: string;
      };
    };
  };
}

type ZoomEvent = ZoomUrlValidationEvent | ZoomParticipantEvent | { event: string; payload: unknown };

function firmaValida(rawBody: string, timestamp: string | undefined, firma: string | undefined, secret: string): boolean {
  if (!timestamp || !firma) return false;
  const esperada =
    "v0=" + createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  return safeEqual(firma, esperada);
}

// POST /api/webhooks/zoom
router.post("/", requireRawBody, (req: Request, res: Response) => {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    log("error", "[WebhookZoom] ZOOM_WEBHOOK_SECRET_TOKEN no configurado");
    res.status(503).json({ error: "Webhook no configurado" });
    return;
  }

  const body = req.body as ZoomEvent;

  // La verificacion CRC inicial no trae firma todavia (es el paso que la habilita) --
  // se responde directo con el token encriptado, como exige Zoom.
  if (body.event === "endpoint.url_validation") {
    const { plainToken } = (body as ZoomUrlValidationEvent).payload;
    const encryptedToken = createHmac("sha256", secret).update(plainToken).digest("hex");
    res.status(200).json({ plainToken, encryptedToken });
    return;
  }

  const firma = req.headers["x-zm-signature"] as string | undefined;
  const timestamp = req.headers["x-zm-request-timestamp"] as string | undefined;
  if (!firmaValida(req.rawBody ?? "", timestamp, firma, secret)) {
    log("warn", "[WebhookZoom] Firma invalida — evento rechazado");
    res.status(401).json({ error: "Firma invalida" });
    return;
  }

  // TODO(mea-logica-negocio R2a): una vez que existan SesionClase/AsistenciaSesion
  // (tarea R1), identificar la SesionClase por el meeting id y al alumno por su
  // email/nombre, y crear/actualizar AsistenciaSesion con fuente="zoom_webhook".
  // Por ahora solo se confirma que la firma es valida y se deja constancia en el
  // log (sin loguear el email completo del participante) para verificar que la
  // integracion con Zoom funciona de punta a punta antes de construir R1.
  if (body.event === "meeting.participant_joined" || body.event === "meeting.participant_left") {
    const p = (body as ZoomParticipantEvent).payload.object;
    log("info", `[WebhookZoom] ${body.event} — meeting=${p.id} participante=${p.participant.user_name ?? "?"}`);
  } else {
    log("info", `[WebhookZoom] Evento recibido: ${body.event}`);
  }

  res.status(200).json({ ok: true });
});

export default router;
