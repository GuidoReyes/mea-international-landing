const REDACTED = "[REDACTED]";
const TRUNCATED = "[TRUNCATED]";
const MAX_DEPTH = 8;
const PHONE_VISIBLE_DIGITS = 4;

// Matches password, newPassword, contraseña, secret, token, accessToken, refresh_token,
// authorization, cookie, api_key, apiKey, codigo, codigoHash, ...
const SENSITIVE_KEY = /(password|passwd|contrase|secret|token|authorization|cookie|api[_-]?key|codigo)/i;

/** Returns only the last digits of a phone number, e.g. 50212345678 -> XXX-5678. */
export function maskPhone(phone: string): string {
  return `XXX-${phone.slice(-PHONE_VISIBLE_DIGITS)}`;
}

function sanitizeError(error: Error): Record<string, unknown> {
  const code = (error as { code?: unknown }).code;
  return {
    name: error.name,
    message: error.message,
    ...(code !== undefined ? { code } : {}),
    // Stack traces reveal file paths and internals: development only
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
  };
}

/**
 * Returns a copy of `value` that is safe to log: sensitive fields are redacted,
 * errors are reduced to name/message/code, and the original is never mutated.
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return sanitizeError(value);
  if (depth >= MAX_DEPTH) return TRUNCATED;
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : sanitizeForLog(item, depth + 1),
    ])
  );
}
