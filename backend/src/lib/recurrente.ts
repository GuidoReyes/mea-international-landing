import crypto from "crypto";
import { log } from "./logger";

// Integración con Recurrente (pagos GT). Auth por par de llaves:
// RECURRENTE_PUBLIC_KEY + RECURRENTE_SECRET_KEY; webhooks firmados estilo Svix
// con RECURRENTE_WEBHOOK_SECRET (whsec_...).

const RECURRENTE_API_URL = process.env.RECURRENTE_API_URL ?? "https://app.recurrente.com/api";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export function isRecurrenteConfigurado(): boolean {
  return Boolean(process.env.RECURRENTE_PUBLIC_KEY && process.env.RECURRENTE_SECRET_KEY);
}

export interface CheckoutRecurrente {
  checkoutUrl: string;
  checkoutId: string;
}

export async function crearCheckoutRecurrente(params: {
  nombre: string;
  descripcion: string;
  montoCentavos: number;
  moneda: string;
  suscripcionId: number;
  emailAlumno: string;
}): Promise<CheckoutRecurrente> {
  const publicKey = process.env.RECURRENTE_PUBLIC_KEY;
  const secretKey = process.env.RECURRENTE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error("Recurrente no configurado");
  }

  const res = await fetch(`${RECURRENTE_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PUBLIC-KEY": publicKey,
      "X-SECRET-KEY": secretKey,
    },
    body: JSON.stringify({
      items: [
        {
          name: params.nombre,
          description: params.descripcion,
          amount_in_cents: params.montoCentavos,
          currency: params.moneda,
          quantity: 1,
        },
      ],
      user_email: params.emailAlumno,
      metadata: { suscripcion_id: String(params.suscripcionId) },
      success_url: `${process.env.FRONTEND_URL ?? "https://www.mea.edu.gt"}/mis-cursos`,
      cancel_url: `${process.env.FRONTEND_URL ?? "https://www.mea.edu.gt"}/planes`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log("error", `[Recurrente] Error creando checkout (${res.status}): ${body.slice(0, 300)}`);
    throw new Error(`Recurrente respondió ${res.status}`);
  }

  const data = (await res.json()) as { id?: string; checkout_url?: string; url?: string };
  const checkoutUrl = data.checkout_url ?? data.url;
  if (!checkoutUrl || !data.id) {
    throw new Error("Respuesta de Recurrente sin checkout_url o id");
  }

  return { checkoutUrl, checkoutId: data.id };
}

// Verificación de firma estilo Svix: HMAC-SHA256 base64 de "id.timestamp.payload"
// con el secreto (parte después de "whsec_"). Exportada pura para poder testearla.
export function verificarFirmaWebhook(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  ahoraEpochSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(ahoraEpochSeconds - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const firmaEsperada = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // El header puede traer varias firmas "v1,<base64> v1,<base64>"
  return signature.split(" ").some((parte) => {
    const valor = parte.includes(",") ? parte.split(",")[1] : parte;
    if (!valor || valor.length !== firmaEsperada.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(valor), Buffer.from(firmaEsperada));
    } catch {
      return false;
    }
  });
}

// Suma meses calendario respetando fin de mes (31 ene + 1 mes → 28/29 feb).
// Exportada pura para poder testearla.
export function agregarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  const diaOriginal = resultado.getDate();
  resultado.setMonth(resultado.getMonth() + meses);
  if (resultado.getDate() !== diaOriginal) {
    resultado.setDate(0); // retrocede al último día del mes anterior
  }
  return resultado;
}
