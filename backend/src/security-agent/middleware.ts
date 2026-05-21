import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

export function securityKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.SECURITY_DASHBOARD_SECRET;

  if (!expectedKey) {
    res.status(500).json({ error: "SECURITY_DASHBOARD_SECRET not configured" });
    return;
  }

  const provided = (req.headers["x-security-key"] as string | undefined) ?? (req.query.key as string | undefined);

  if (!provided) {
    res.status(403).json({ error: "Missing security key" });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(provided.padEnd(expectedKey.length));
    const b = Buffer.from(expectedKey.padEnd(provided.length));
    if (a.length === b.length && timingSafeEqual(a, b)) {
      next();
      return;
    }
  } catch {
    // fall through to 403
  }

  res.status(403).json({ error: "Invalid security key" });
}
