import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AdminPayload {
  adminId: number;
  email: string;
  rol: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  // Preferir cookie httpOnly (no legible por JS → inmune a robo por XSS).
  // Se acepta también Authorization: Bearer para clientes no-navegador y
  // para no romper sesiones existentes durante la transición.
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.mea_admin_token as string | undefined;
  const token = cookieToken ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined);

  if (!token) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET no configurado" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AdminPayload;
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Autorización por rol. El gating de SUPER_ADMIN existía solo en el frontend
// (app/admin/layout.tsx) — sin esto, cualquier admin válido accede a los
// reportes financieros pegándole directo a la API.
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin || !roles.includes(req.admin.rol)) {
      res.status(403).json({ error: "Permiso insuficiente" });
      return;
    }
    next();
  };
}
