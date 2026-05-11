import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_MESSAGES = 10;
const WINDOW_MS = 60_000;

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 300_000);

export function rateLimitWhatsApp(req: Request, res: Response, next: NextFunction) {
  const body = req.body as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: string }> } }> }>;
  };
  const telefono = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

  if (!telefono) { next(); return; }

  const now = Date.now();
  const entry = store.get(telefono);

  if (!entry || entry.resetAt < now) {
    store.set(telefono, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > MAX_MESSAGES) {
    console.warn(`[RateLimit] XXX-${telefono.slice(-4)} — límite alcanzado (${entry.count}/min)`);
    res.status(200).send("OK"); // Meta requiere 200 siempre
    return;
  }

  next();
}
