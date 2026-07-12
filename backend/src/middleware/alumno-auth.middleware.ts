import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AlumnoPayload {
  alumnoId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      alumno?: AlumnoPayload;
    }
  }
}

function extractPayload(req: Request): AlumnoPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(authHeader.slice(7), secret) as Partial<AlumnoPayload>;
    // Un token de admin también firma con JWT_SECRET — exigir alumnoId
    if (typeof payload.alumnoId !== "number") return null;
    return { alumnoId: payload.alumnoId, email: payload.email ?? "" };
  } catch {
    return null;
  }
}

export function verifyAlumnoJWT(req: Request, res: Response, next: NextFunction): void {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: "JWT_SECRET no configurado" });
    return;
  }

  const payload = extractPayload(req);
  if (!payload) {
    res.status(401).json({ error: "Token de alumno requerido o inválido" });
    return;
  }

  req.alumno = payload;
  next();
}

// No falla sin token: deja req.alumno undefined y sigue (para rutas públicas con extras si hay sesión)
export function optionalAlumnoJWT(req: Request, _res: Response, next: NextFunction): void {
  const payload = extractPayload(req);
  if (payload) req.alumno = payload;
  next();
}
