import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

const TOKEN_TTL_HORAS = 8; // jornada laboral — reduce la ventana ante robo de sesión

// Fuerza bruta: 5 intentos por IP+email cada 15 minutos. Requiere
// app.set("trust proxy", 1) en index.ts para que req.ip sea el cliente real
// detrás del proxy de Railway.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String((req.body as { email?: string })?.email ?? "").toLowerCase()}`,
  message: { error: "Demasiados intentos fallidos. Esperá 15 minutos." },
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" alcanza: www.mea.edu.gt → api.mea.edu.gt es same-site,
    // igual que localhost:3000 → localhost:4000 en desarrollo.
    sameSite: "lax" as const,
    maxAge: TOKEN_TTL_HORAS * 60 * 60 * 1000,
    path: "/",
  };
}

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
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
    { expiresIn: `${TOKEN_TTL_HORAS}h` }
  );

  // El token viaja en cookie httpOnly — el JS del panel no puede leerlo,
  // así que un XSS ya no puede exfiltrarlo.
  res.cookie("mea_admin_token", token, cookieOptions());

  res.json({
    // token en el body solo por compatibilidad mientras el frontend viejo
    // (localStorage) siga desplegado — quitarlo cuando Vercel tenga la
    // versión que usa la cookie.
    token,
    admin: { id: admin.id, email: admin.email, nombre: admin.nombre, rol: admin.rol },
  });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("mea_admin_token", { path: "/" });
  res.json({ ok: true });
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
