import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export function auditLog(accion: string, recurso: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.admin?.adminId;
      const ip = req.ip ?? req.socket.remoteAddress ?? null;
      const detalle = req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(req.body)
        : null;

      if (adminId) {
        await prisma.auditoriaAdmin.create({
          data: { adminId, accion, recurso, detalle, ip: ip ?? null },
        });
      }
    } catch {
      // Audit failures must never block the request
    }
    next();
  };
}
