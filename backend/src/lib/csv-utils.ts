import { parse } from "csv-parse/sync";

/**
 * vuln_025: los imports de CSV (inscripciones.ts) partían cada línea con
 * `line.split(",")`, que rompe con cualquier campo entre comillas que contenga
 * una coma (ej. un apellido `"Pérez, Jr."`) — desalinea las columnas siguientes
 * en vez de fallar limpio. csv-parse entiende comillas RFC 4180 y saltos de
 * línea dentro de un campo citado.
 */
export function parseCsvRows(text: string): string[][] {
  return parse(text, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];
}
