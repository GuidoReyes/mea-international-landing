import { type Request, type Response, type NextFunction } from "express";
import twilio from "twilio";
import { log } from "../lib/logger";

/**
 * Verifies that the incoming request genuinely comes from Twilio by checking
 * the X-Twilio-Signature HMAC using the auth token and the full request URL.
 *
 * Twilio sends form-urlencoded bodies (not JSON), so express.urlencoded()
 * must be mounted before this middleware.
 */
export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Skip verification in development when no token is configured
  if (!authToken) {
    log("warn", "[Twilio] TWILIO_AUTH_TOKEN not set — skipping signature verification");
    next();
    return;
  }

  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) {
    log("warn", "[Twilio] Missing X-Twilio-Signature header");
    res.status(403).json({ error: "Missing Twilio signature" });
    return;
  }

  // Reconstruct the full public URL Twilio posted to
  const protocol  = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host      = req.headers["x-forwarded-host"] ?? req.headers.host;
  const fullUrl   = `${protocol}://${host}${req.originalUrl}`;

  const valid = twilio.validateRequest(authToken, signature, fullUrl, req.body as Record<string, string>);
  if (!valid) {
    log("warn", `[Twilio] Invalid signature for ${fullUrl}`);
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
}
