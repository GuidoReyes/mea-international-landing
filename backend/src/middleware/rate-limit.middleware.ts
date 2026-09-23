import { Request, Response, NextFunction } from "express";
import client from "../lib/redis";
import { log } from "../lib/logger";
import { maskPhone } from "../lib/log-sanitize";
import {
  ResilientStore,
  createLimiter,
  ipKey,
  readPositiveInt,
  type LimiterConfig,
} from "../lib/rate-limit-store";

const MAX_MESSAGES = 10;
const WINDOW_SECONDS = 60;

// Rate-limit por teléfono del webhook de WhatsApp, respaldado en Redis para
// que el contador sobreviva reinicios y sea correcto si algún día hay más de
// una instancia en Railway (el Map en memoria anterior contaba por proceso).
// Fail-open: si Redis no está listo, el mensaje pasa — perder un límite
// momentáneo es mejor que dejar de responder leads.
export async function rateLimitWhatsApp(req: Request, res: Response, next: NextFunction) {
  const body = req.body as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: string }> } }> }>;
  };
  const telefono = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

  if (!telefono || !client.isReady) {
    next();
    return;
  }

  try {
    const key = `ratelimit:wa:${telefono}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_MESSAGES) {
      log("warn", `[RateLimit] ${maskPhone(telefono)} — límite alcanzado (${count}/min)`);
      res.status(200).send("OK"); // Meta requiere 200 siempre
      return;
    }
  } catch (err) {
    // Redis falló a mitad de la operación: dejar pasar (fail-open)
    log("error", "[RateLimit] Error en Redis, dejando pasar:", err);
  }

  next();
}

// ── Limitadores con express-rate-limit ────────────────────────────────────────
// Redis compartido entre instancias; si no está disponible caen a memoria con aviso.
// Cada tope se puede ajustar con su variable RATE_LIMIT_*_MAX sin tocar el código.

const MINUTE_MS = 60_000;
const FIFTEEN_MINUTES_MS = 15 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;
const KEY_PREFIX = "ratelimit:";

// Los webhooks de Meta, Twilio y Recurrente nunca deben frenarse por IP
const WEBHOOK_PATH_PREFIXES = ["/meta/", "/webhooks/", "/twilio/"];

const max = (envName: string, fallback: number): number => readPositiveInt(process.env[envName], fallback);

function redisLimiter(config: LimiterConfig) {
  return createLimiter(config, { store: new ResilientStore(`${KEY_PREFIX}${config.name}:`, client) });
}

const byAlumno = (req: Request): string => `alumno:${req.alumno?.alumnoId ?? ipKey(req)}`;

/** Tope general por IP. Hoy se aplica a /api/marketing; no a todo /api para no estrangular al sitio público. */
export const globalLimiter = redisLimiter({
  name: "global",
  windowMs: FIFTEEN_MINUTES_MS,
  limit: max("RATE_LIMIT_GLOBAL_MAX", 300),
  message: "Demasiadas solicitudes. Intentá de nuevo en unos minutos.",
  skip: (req) => WEBHOOK_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix)),
});

/** Login, registro y OTP de alumnos: un solo contador por IP (IPv6 normalizado). */
export const alumnoLoginLimiter = redisLimiter({
  name: "alumno-login",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_ALUMNO_LOGIN_MAX", 5),
  message: "Demasiados intentos. Esperá un minuto e intentá de nuevo.",
});

/** Checkout de suscripciones (tarjeta y depósito): por alumno. */
export const checkoutLimiter = redisLimiter({
  name: "checkout",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_CHECKOUT_MAX", 5),
  message: "Demasiados intentos de checkout. Esperá un minuto.",
  keyGenerator: byAlumno,
});

/** Unirse a una clase en vivo: por alumno. */
export const joinLimiter = redisLimiter({
  name: "join",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_JOIN_MAX", 10),
  message: "Demasiados intentos. Esperá un minuto.",
  keyGenerator: byAlumno,
});

/** Escaneos de seguridad (llaman a la API de Anthropic y cuestan dinero). */
export const scanLimiter = redisLimiter({
  name: "security-scan",
  windowMs: HOUR_MS,
  limit: max("RATE_LIMIT_SCAN_MAX", 2),
  message: "Límite de escaneos alcanzado. Intentá más tarde.",
});

/** Solo cuenta los intentos fallidos contra el dashboard y el backup (fuerza bruta de la clave). */
export const securityAuthLimiter = redisLimiter({
  name: "security-auth",
  windowMs: FIFTEEN_MINUTES_MS,
  limit: max("RATE_LIMIT_SECURITY_AUTH_MAX", 10),
  message: "Demasiados intentos fallidos. Esperá 15 minutos.",
  skipSuccessfulRequests: true,
});

/** Comprobantes de depósito: por pago. */
export const uploadLimiter = redisLimiter({
  name: "upload",
  windowMs: HOUR_MS,
  limit: max("RATE_LIMIT_UPLOAD_MAX", 3),
  message: "Demasiados comprobantes enviados para este pago. Intentá más tarde.",
  keyGenerator: (req) => `pago:${String(req.params["pagoId"] ?? "")}`,
});

/** Webhook de Twilio: generoso, solo para cortar un abuso evidente. */
export const webhookLimiter = redisLimiter({
  name: "webhook",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_WEBHOOK_MAX", 100),
  message: "Demasiadas solicitudes.",
});

/** Verificación pública de certificados (vuln_020): sin JWT, por IP. El código
 * tiene 64 bits de entropía (no es fuerza-bruteable en la práctica), pero sigue
 * siendo el único endpoint de certificados sin límite — esto también corta el
 * scraping/DoS trivial. */
export const certVerifyLimiter = redisLimiter({
  name: "cert-verify",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_CERT_VERIFY_MAX", 20),
  message: "Demasiadas verificaciones. Intentá de nuevo en un minuto.",
});

/** Reportes financieros (vuln_035): ya requieren SUPER_ADMIN, pero son consultas
 * de agregación pesadas — un límite bajo por admin evita que un script con bug
 * (o una cuenta comprometida) las machaque en loop. */
export const financialReportsLimiter = redisLimiter({
  name: "financial-reports",
  windowMs: MINUTE_MS,
  limit: max("RATE_LIMIT_FINANCIAL_REPORTS_MAX", 5),
  message: "Demasiadas solicitudes de reportes. Esperá un minuto.",
  keyGenerator: (req) => `admin:${req.admin?.adminId ?? ipKey(req)}`,
});
