import type { Request, Response, NextFunction } from "express";
import { log } from "../lib/logger";

/**
 * Webhook signatures are computed over the raw request body. If it was not captured
 * (express.json({ verify }) not mounted before the route, or an empty body), every real
 * event would fail the signature check with a confusing error: reject explicitly instead.
 */
export function requireRawBody(req: Request, res: Response, next: NextFunction): void {
  if (!req.rawBody) {
    log("warn", `[Webhook] rawBody ausente en ${req.originalUrl}: revisar que express.json({ verify }) se monte antes de la ruta`);
    res.status(400).json({ error: "Cuerpo de la petición requerido" });
    return;
  }
  next();
}
