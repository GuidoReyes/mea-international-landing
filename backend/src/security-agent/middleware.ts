import type { NextFunction, Request, Response } from "express";
import { safeEqual } from "../lib/safe-equal";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export type AuthOutcome = "ok" | "missing" | "invalid" | "csrf" | "unconfigured";

// Browsers state who started a request in Sec-Fetch-Site. Only our own pages ("same-origin",
// or a typed URL: "none") may use the session cookie freely. SameSite=Strict does not exclude
// sibling sites of the same registrable domain (e.g. www.mea.edu.gt), which CORS lets read
// credentialed responses, so anything else is limited to a plain page navigation.
const TRUSTED_FETCH_SITES = new Set(["same-origin", "none"]);

const DENIED_MESSAGE: Record<"missing" | "invalid" | "csrf", string> = {
  missing: "Missing security key",
  invalid: "Invalid security key",
  csrf: "Cross-site request blocked",
};

// No GET/navigation exemption: SameSite=Strict already never attaches the cookie to a
// cross-site request, top-level navigation included (unlike Lax). If Sec-Fetch-Site ever
// reports cross-site or same-site here, something upstream is misbehaving; block regardless
// of method rather than special-case "read-only" requests.
function isCrossSiteRequest(req: Request): boolean {
  const site = req.headers["sec-fetch-site"];
  return site !== undefined && !TRUSTED_FETCH_SITES.has(String(site));
}

/**
 * Two ways in: the key itself in the X-Security-Key header (CLI and CI), or the session cookie
 * issued by POST /api/security/login (browsers). The key is never read from the URL: it would
 * end up in history, logs and Referer headers. When the header is present it decides.
 */
export function authorize(req: Request): AuthOutcome {
  const secret = process.env.SECURITY_DASHBOARD_SECRET;
  if (!secret) return "unconfigured";

  const header = req.headers["x-security-key"];
  if (typeof header === "string" && header !== "") {
    return safeEqual(header, secret) ? "ok" : "invalid";
  }

  const token = req.cookies?.[SESSION_COOKIE];
  if (token === undefined) return "missing";
  if (!verifySessionToken(token, secret)) return "invalid";
  return isCrossSiteRequest(req) ? "csrf" : "ok";
}

export function securityKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const outcome = authorize(req);

  if (outcome === "ok") {
    next();
    return;
  }
  if (outcome === "unconfigured") {
    res.status(500).json({ error: "SECURITY_DASHBOARD_SECRET not configured" });
    return;
  }
  res.status(403).json({ error: DENIED_MESSAGE[outcome] });
}
