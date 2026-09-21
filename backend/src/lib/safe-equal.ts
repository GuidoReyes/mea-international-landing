import { createHash, timingSafeEqual } from "crypto";

const sha256 = (value: string): Buffer => createHash("sha256").update(value).digest();

/**
 * Compares two secrets in constant time.
 *
 * Both values are hashed to a fixed 32-byte digest first, so the comparison is exact
 * and independent of input length. Never pad or normalize the inputs: padding makes
 * "secret" and "secret   " compare equal.
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}
