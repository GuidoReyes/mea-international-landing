import type { Request, Response, NextFunction } from "express";
import { createHash, timingSafeEqual } from "crypto";

// Hashing gives both sides a fixed length, so the comparison is exact and constant-time
// regardless of how long the provided key is (no padding tricks).
function isValidKey(provided: string, expected: string): boolean {
  const digest = (value: string): Buffer => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

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

  // ?key=a&key=b arrives as an array; only a plain string can be a valid key
  if (typeof provided === "string" && isValidKey(provided, expectedKey)) {
    next();
    return;
  }

  res.status(403).json({ error: "Invalid security key" });
}
