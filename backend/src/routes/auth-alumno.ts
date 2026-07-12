import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";

const router = Router();

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "24h";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;
const MIN_PASSWORD_LENGTH = 8;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.resetAt < now) loginAttempts.delete(key);
  }
}, 300_000);

function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    res.status(429).json({ error: "Demasiados intentos. Esperá un minuto e intentá de nuevo." });
    return;
  }
  next();
}

router.post("/login", rateLimitLogin, async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña requeridos" });
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { email } });
  if (!alumno || !alumno.activo || !alumno.password) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, alumno.password);
  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET no configurado" });
    return;
  }

  const token = jwt.sign({ alumnoId: alumno.id, email: alumno.email }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.json({
    token,
    primerLogin: alumno.primerLogin,
    alumno: {
      id: alumno.id,
      email: alumno.email,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      carnet: alumno.carnet,
    },
  });
});

router.post("/cambiar-password", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const { passwordActual, passwordNueva } = req.body as {
    passwordActual?: string;
    passwordNueva?: string;
  };

  if (!passwordActual || !passwordNueva) {
    res.status(400).json({ error: "passwordActual y passwordNueva requeridos" });
    return;
  }

  if (passwordNueva.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { id: req.alumno!.alumnoId } });
  if (!alumno || !alumno.activo || !alumno.password) {
    res.status(401).json({ error: "Cuenta inactiva" });
    return;
  }

  const valid = await bcrypt.compare(passwordActual, alumno.password);
  if (!valid) {
    res.status(401).json({ error: "Contraseña actual incorrecta" });
    return;
  }

  const hashed = await bcrypt.hash(passwordNueva, BCRYPT_ROUNDS);
  await prisma.alumno.update({
    where: { id: alumno.id },
    data: { password: hashed, primerLogin: false },
  });

  res.json({ message: "Contraseña actualizada" });
});

router.get("/me", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const alumno = await prisma.alumno.findUnique({
    where: { id: req.alumno!.alumnoId },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      carnet: true,
      activo: true,
      primerLogin: true,
    },
  });

  if (!alumno || !alumno.activo) {
    res.status(401).json({ error: "Cuenta inactiva" });
    return;
  }
  res.json(alumno);
});

export default router;
