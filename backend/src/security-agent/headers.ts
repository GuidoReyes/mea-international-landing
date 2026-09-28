import type { NextFunction, Request, Response } from "express";

// script-src stays strict: no inline scripts and no inline event handlers.
// style-src keeps 'unsafe-inline' because the dashboard uses inline style attributes, and
// Google Fonts are the only external resource the pages load.
export const DASHBOARD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

/** Headers for the dashboard pages and its API: strict CSP, and never cache scan or backup data. */
export function dashboardHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Content-Security-Policy", DASHBOARD_CSP);
  res.setHeader("Cache-Control", "no-store");
  next();
}
