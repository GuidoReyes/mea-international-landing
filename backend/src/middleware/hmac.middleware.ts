import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

export function verifyMetaHmac(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!signature) {
    res.status(403).json({ error: "Missing signature" });
    return;
  }

  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const rawBody = req.rawBody ?? "";
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      res.status(403).json({ error: "Invalid signature" });
      return;
    }
  } catch {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  next();
}
