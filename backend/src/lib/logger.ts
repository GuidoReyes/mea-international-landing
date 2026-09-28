import { sanitizeForLog } from "./log-sanitize";

type Level = "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

export function log(level: Level, msg: string, meta?: unknown): void {
  // vuln_009 (riesgo aceptado, decisión del dueño del proyecto — ronda 2, tarea
  // #504): "info" se descarta en producción para no llenar los logs de Railway
  // con ruido operativo. Se revisaron los eventos de seguridad reales del
  // proyecto (rate-limit excedido en rate-limit.middleware.ts, fallo de envío
  // de OTP en auth-alumno.ts) y ya loguean en "warn"/"error", no en "info" — hoy
  // no hay ningún evento de seguridad que esta línea esconda. Regla a futuro:
  // todo log relacionado a seguridad (intentos fallidos, límites, accesos
  // denegados) debe usar "warn" o "error", nunca "info".
  if (isProd && level === "info") return;
  const line = meta !== undefined ? `${msg} ${JSON.stringify(sanitizeForLog(meta))}` : msg;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
