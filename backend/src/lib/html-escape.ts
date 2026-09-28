const ESCAPE_MAP: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Server-side HTML escaping for values interpolated into an HTML string built
 * by hand (no templating engine). Distinct from the browser-side esc() in
 * dashboard/app.js — this runs in Node, before the string ever reaches a client.
 */
export function escHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c] ?? c);
}
