export interface DateFilterResult {
  readonly valid: boolean;
  readonly date?: Date;
}

/**
 * Parses an optional date-filter query param. `undefined` is valid (no filter applied);
 * anything else must parse to a real date, otherwise `new Date(input)` would silently
 * produce an Invalid Date that either breaks the query or is dropped without explanation.
 */
export function parseDateFilter(input: string | undefined): DateFilterResult {
  if (input === undefined) return { valid: true, date: undefined };
  if (input.trim() === "") return { valid: false };

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return { valid: false };

  return { valid: true, date };
}
