import { createHmac } from "crypto";
import type { CookieOptions } from "express";
import { safeEqual } from "../lib/safe-equal";

export const SESSION_COOKIE = "security_session";
export const SESSION_TTL_MS = 30 * 60 * 1000;

// Domain separation: the same secret also derives the history encryption key, so the HMAC
// input is prefixed with a label that no other use of the secret shares.
const SESSION_LABEL = "mea-security-session-v1";

const sign = (expiresAt: string, secret: string): string =>
  createHmac("sha256", secret).update(`${SESSION_LABEL}.${expiresAt}`).digest("base64url");

/**
 * Stateless session token: "<expiry epoch ms>.<HMAC-SHA256 of the expiry>". Nothing is stored
 * on the server, so it works across instances; rotating SECURITY_DASHBOARD_SECRET invalidates
 * every session. It cannot be revoked individually, which is why the lifetime is short.
 */
export function createSessionToken(secret: string, nowMs: number = Date.now()): string {
  const expiresAt = String(nowMs + SESSION_TTL_MS);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(token: unknown, secret: string, nowMs: number = Date.now()): boolean {
  if (typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresAt, signature] = parts;
  if (!/^\d+$/.test(expiresAt) || signature === "") return false;
  if (Number(expiresAt) <= nowMs) return false;

  return safeEqual(signature, sign(expiresAt, secret));
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true, // not readable from JavaScript, so an XSS cannot steal the session
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/", // the dashboard (/security) and its API (/api/security, /api/backup) share it
  };
}
