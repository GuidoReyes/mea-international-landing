import { Request, Response, NextFunction } from "express";
import client from "../lib/redis";
import { log } from "../lib/logger";

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
      log("warn", `[RateLimit] XXX-${telefono.slice(-4)} — límite alcanzado (${count}/min)`);
      res.status(200).send("OK"); // Meta requiere 200 siempre
      return;
    }
  } catch (err) {
    // Redis falló a mitad de la operación: dejar pasar (fail-open)
    log("error", "[RateLimit] Error en Redis, dejando pasar:", err);
  }

  next();
}
