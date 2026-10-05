import { Router, Request, Response } from "express";
import { createHmac } from "crypto";
import { log } from "../lib/logger";
import { safeEqual } from "../lib/safe-equal";
import { requireRawBody } from "../middleware/raw-body.middleware";
import prisma from "../lib/prisma";

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

// Extrae el ID numérico de reunión desde una urlZoom tipo
// https://mea.zoom.us/j/123456789?pwd=abc. No se inventa el ID si el link no
// sigue ese formato (ej. una Personal Meeting Room con nombre en vez de número).
function idReunionDesdeUrl(urlZoom: string): string | null {
  return urlZoom.match(/\/j\/(\d+)/)?.[1] ?? null;
}

function maskEmail(email: string): string {
  const [local, dominio] = email.split("@");
  return dominio ? `${local?.[0] ?? "?"}***@${dominio}` : "[email inválido]";
}

// Mismo grupo puede tener varias SesionClase cercanas en fechas distintas; se
// toma la mas cercana al momento real del evento, no la primera que aparezca.
const VENTANA_MATCH_SESION_MS = 3 * 60 * 60 * 1000; // 3 horas

async function registrarAsistencia(evento: ZoomParticipantEvent): Promise<void> {
  const { id: meetingId, participant } = evento.payload.object;
  const email = participant.email?.trim().toLowerCase();

  if (!email) {
    log("warn", `[WebhookZoom] Participante sin email en meeting=${meetingId} — no se puede identificar al alumno, evento ignorado.`);
    return;
  }

  const grupos = await prisma.grupoClaseEnVivo.findMany({
    where: { activo: true },
    select: { id: true, urlZoom: true },
  });
  const grupo = grupos.find((g) => idReunionDesdeUrl(g.urlZoom) === String(meetingId));
  if (!grupo) {
    log("warn", `[WebhookZoom] meeting=${meetingId} no coincide con ningún GrupoClaseEnVivo activo — evento ignorado.`);
    return;
  }

  const ahora = new Date();
  const candidatas = await prisma.sesionClase.findMany({
    where: {
      grupoId: grupo.id,
      estado: { not: "CANCELADA" },
      fechaHora: {
        gte: new Date(ahora.getTime() - VENTANA_MATCH_SESION_MS),
        lte: new Date(ahora.getTime() + VENTANA_MATCH_SESION_MS),
      },
    },
  });
  const sesion = candidatas.sort(
    (a, b) => Math.abs(a.fechaHora.getTime() - ahora.getTime()) - Math.abs(b.fechaHora.getTime() - ahora.getTime())
  )[0];

  if (!sesion) {
    log("warn", `[WebhookZoom] Sin SesionClase cercana para grupo=${grupo.id} (meeting=${meetingId}) — evento ignorado. Revisar que el cron de generación esté corriendo.`);
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { email }, select: { id: true } });
  if (!alumno) {
    log("warn", `[WebhookZoom] Email ${maskEmail(email)} no coincide con ningún Alumno — evento ignorado (puede ser el profesor u otro invitado).`);
    return;
  }

  await prisma.asistenciaSesion.upsert({
    where: { alumnoId_sesionId: { alumnoId: alumno.id, sesionId: sesion.id } },
    create: { alumnoId: alumno.id, sesionId: sesion.id, asistio: true, fuente: "zoom_webhook" },
    update: { asistio: true, fuente: "zoom_webhook", marcadoEn: new Date() },
  });

  log("info", `[WebhookZoom] Asistencia registrada: alumno=${alumno.id} sesion=${sesion.id}`);
}

// POST /api/webhooks/zoom
router.post("/", requireRawBody, async (req: Request, res: Response) => {
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

  // Solo "joined" escribe asistencia -- alcanza con que haya entrado una vez
  // para contar la sesion como recibida; "left" se reconoce pero no hace
  // falta para el dato que hoy pide el negocio (asistio si/no).
  if (body.event === "meeting.participant_joined") {
    await registrarAsistencia(body as ZoomParticipantEvent).catch((err) =>
      log("error", "[WebhookZoom] Error registrando asistencia:", err)
    );
  } else if (body.event === "meeting.participant_left") {
    const p = (body as ZoomParticipantEvent).payload.object;
    log("info", `[WebhookZoom] participant_left — meeting=${p.id}`);
  } else {
    log("info", `[WebhookZoom] Evento recibido: ${body.event}`);
  }

  res.status(200).json({ ok: true });
});

export default router;
