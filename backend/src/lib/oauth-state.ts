import { randomBytes } from "crypto";
import { safeEqual } from "./safe-equal";

/**
 * Generates a random OAuth `state` value. Used by one-time local setup scripts (e.g.
 * get-drive-token.ts) so the local callback server rejects an authorization response
 * that did not originate from the auth URL it just printed — otherwise a page the
 * developer has open could redirect their browser to the local callback with an
 * attacker-controlled `code`, and the script would exchange and print that code's token.
 */
export function generateOAuthState(): string {
  return randomBytes(16).toString("hex");
}

export function verifyOAuthState(received: string | null | undefined, expected: string): boolean {
  if (!received) return false;
  return safeEqual(received, expected);
}
