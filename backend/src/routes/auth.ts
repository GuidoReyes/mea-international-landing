import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

const TOKEN_TTL_HORAS = 8; // jornada laboral — reduce la ventana ante robo de sesión

// vuln_010: el token viaja en cookie httpOnly (inmune a robo por XSS) desde antes; el
// panel de admin (lib/api.ts) ya usa credentials:"include" en todo y no lee este campo
// del cuerpo — verificado en el código del frontend. La bandera es la red de seguridad
// por si algún build de Vercel más viejo siguiera desplegado esperando el token en el
// body. Por defecto sigue incluido; poner LEGACY_TOKEN_IN_BODY=false una vez confirmado
// que el frontend en producción no lo necesita, y luego borrar la bandera y el campo.
export function shouldIncludeTokenInBody(): boolean {
  return process.env.LEGACY_TOKEN_IN_BODY !== "false";
}

// Fuerza bruta: 5 intentos por IP+email cada 15 minutos. Requiere
// app.set("trust proxy", 1) en index.ts para que req.ip sea el cliente real
// detrás del proxy de Railway.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // ipKeyGenerator normaliza IPv6 a su prefijo /64 — sin esto, un cliente
  // IPv6 rota la parte baja de su dirección y evade el límite (así pasaba
  // en producción: 6 intentos daban 401 y nunca 429).
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}:${String((req.body as { email?: string })?.email ?? "").toLowerCase()}`,
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
    ...(shouldIncludeTokenInBody() ? { token } : {}),
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
