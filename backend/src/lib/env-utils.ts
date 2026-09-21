/** Reads a positive integer from an env value; anything else (empty, text, 0, negative) gives the fallback. */
export function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const value = Number(raw);
  return value > 0 ? value : fallback;
}
