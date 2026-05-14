type Level = "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

export function log(level: Level, msg: string, meta?: unknown): void {
  if (isProd && level === "info") return;
  const line = meta !== undefined ? `${msg} ${JSON.stringify(meta)}` : msg;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
