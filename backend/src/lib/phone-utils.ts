/**
 * Keeps only the digits: "whatsapp:+502 1234-5678" -> "50212345678".
 * Digits-only is the format already stored in the database (Meta sends `from` that way),
 * so normalizing to E.164 with a "+" would break existing lookups.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** True when both numbers match after normalizing. Fails closed if either one is empty or missing. */
export function isSamePhone(a: string | undefined, b: string | undefined): boolean {
  const left = normalizePhone(a ?? "");
  const right = normalizePhone(b ?? "");
  return left !== "" && left === right;
}
