import { Prisma } from "@prisma/client";

const DEFAULT_MAX_ATTEMPTS = 3;

/** True when `err` is Prisma's "unique constraint failed" (P2002) on the given field. */
export function isUniqueConstraintOn(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = err.meta?.["target"];
  if (typeof target === "string") return target.includes(field);
  if (Array.isArray(target)) return target.includes(field);
  return false;
}

/**
 * Runs `attempt` and, if it throws a P2002 on `field`, runs it again (up to `maxAttempts`
 * times total) so a fresh candidate value can be computed each time — e.g. a carnet whose
 * generation reads a count() and is therefore racy under concurrent requests, even though
 * the database's own UNIQUE constraint (already present) is what actually prevents the
 * collision. Any other error, or a P2002 on a different field, is rethrown immediately:
 * retrying would not fix it.
 */
export async function createWithUniqueRetry<T>(
  attempt: () => Promise<T>,
  field: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (!isUniqueConstraintOn(err, field)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
