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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  const token = authHeader.slice(7);
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
