import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña requeridos" });
    return;
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.activo) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET no configurado" });
    return;
  }

  const token = jwt.sign(
    { adminId: admin.id, email: admin.email, rol: admin.rol },
    secret,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, nombre: admin.nombre, rol: admin.rol },
  });
});

router.get("/me", verifyJWT, async (req: Request, res: Response) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin!.adminId },
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });
  if (!admin || !admin.activo) {
    res.status(401).json({ error: "Cuenta inactiva" });
    return;
  }
  res.json(admin);
});

export default router;
