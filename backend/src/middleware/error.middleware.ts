import type { NextFunction, Request, Response } from "express";
import { log } from "../lib/logger";
import { sanitizeForLog } from "../lib/log-sanitize";

interface HttpError {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  stack?: unknown;
}

function statusOf(err: HttpError): number {
  const candidate = err.status ?? err.statusCode;
  return typeof candidate === "number" && candidate >= 400 && candidate < 600 ? candidate : 500;
}

function messageOf(err: HttpError, status: number): string {
  // A generic message for 5xx in production: the specifics belong in the server log,
  // not in the response (stack traces and driver errors can leak internals).
  if (status >= 500 && process.env.NODE_ENV === "production") return "Error interno del servidor";
  return typeof err.message === "string" && err.message ? err.message : "Error interno del servidor";
}

/**
 * Centralized error handler — must be the LAST app.use(). Express 5 forwards a rejected
 * promise from any async route handler here automatically, so route handlers no longer
 * each need their own try/catch to avoid an unhandled rejection (vuln_024); this still adds
 * a consistent JSON shape and keeps stack traces out of production responses.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const httpError = (err && typeof err === "object" ? err : { message: String(err) }) as HttpError;
  const status = statusOf(httpError);

  log("error", `[Error] ${req.method ?? ""} ${req.originalUrl ?? ""} -> ${status}`, sanitizeForLog(err));

  res.status(status).json({
    error: messageOf(httpError, status),
    ...(process.env.NODE_ENV !== "production" && typeof httpError.stack === "string"
      ? { stack: httpError.stack }
      : {}),
  });
}
