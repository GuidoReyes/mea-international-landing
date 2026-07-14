import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { log } from "../lib/logger";

const router = Router();

const BCRYPT_ROUNDS = 12;
const OTP_BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY = "24h";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;
const MIN_PASSWORD_LENGTH = 8;
const OTP_EXPIRA_MINUTOS = 10;
const OTP_MAX_POR_HORA = 3;
const GT_PREFIJO = "502";
const GT_DIGITOS_LOCALES = 8;

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

// ─── Registro self-service (email o WhatsApp+OTP) ───────────────────────────

function normalizarWhatsapp(raw: string): string | null {
  const digitos = raw.replace(/\D/g, "");
  if (digitos.length === GT_DIGITOS_LOCALES) return GT_PREFIJO + digitos;
  if (digitos.length >= 10 && digitos.length <= 15) return digitos;
  return null;
}

function generarCarnetWeb(): string {
  // Único sin consultar la DB: timestamp + 2 bytes aleatorios, legible para el admin.
  const sufijo = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `WEB-${Date.now().toString(36).toUpperCase()}${sufijo}`;
}

function firmarSesion(alumno: { id: number; email: string | null }, res: Response): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET no configurado" });
    return null;
  }
  return jwt.sign({ alumnoId: alumno.id, email: alumno.email }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
}

// POST /api/auth/alumno/registro — registro estándar con correo + contraseña
router.post("/registro", rateLimitLogin, async (req: Request, res: Response) => {
  const { nombre, apellido, email, password } = req.body as {
    nombre?: string;
    apellido?: string;
    email?: string;
    password?: string;
  };

  if (!nombre?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "nombre, email y password son requeridos" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
    return;
  }

  const emailNormalizado = email.trim().toLowerCase();
  const existente = await prisma.alumno.findUnique({ where: { email: emailNormalizado } });
  if (existente) {
    res.status(409).json({ error: "Ya existe una cuenta con ese correo. Iniciá sesión." });
    return;
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const alumno = await prisma.alumno.create({
    data: {
      carnet: generarCarnetWeb(),
      nombre: nombre.trim(),
      apellido: apellido?.trim() || "",
      email: emailNormalizado,
      password: hashed,
      primerLogin: false,
      activo: true,
    },
  });

  const token = firmarSesion(alumno, res);
  if (!token) return;

  res.status(201).json({
    token,
    primerLogin: false,
    alumno: {
      id: alumno.id,
      email: alumno.email,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      carnet: alumno.carnet,
    },
  });
});

// POST /api/auth/alumno/otp/solicitar — envía un código de 6 dígitos por WhatsApp
router.post("/otp/solicitar", rateLimitLogin, async (req: Request, res: Response) => {
  const { whatsapp } = req.body as { whatsapp?: string };
  const numero = whatsapp ? normalizarWhatsapp(whatsapp) : null;
  if (!numero) {
    res.status(400).json({ error: "Número de WhatsApp inválido. Usá el formato 5555-5555 (Guatemala) o incluí el código de país." });
    return;
  }

  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await prisma.otpCode.count({
    where: { whatsapp: numero, creadoEn: { gte: haceUnaHora } },
  });
  if (recientes >= OTP_MAX_POR_HORA) {
    res.status(429).json({ error: "Demasiados códigos solicitados. Esperá una hora e intentá de nuevo." });
    return;
  }

  const codigo = crypto.randomInt(100000, 1000000).toString();
  const codigoHash = await bcrypt.hash(codigo, OTP_BCRYPT_ROUNDS);
  await prisma.otpCode.create({
    data: {
      whatsapp: numero,
      codigoHash,
      expiraEn: new Date(Date.now() + OTP_EXPIRA_MINUTOS * 60 * 1000),
    },
  });

  const envio = await sendWhatsAppMessage(
    numero,
    `Tu código de verificación de MEA International es: ${codigo}\n\nVence en ${OTP_EXPIRA_MINUTOS} minutos. Si no lo pediste, ignorá este mensaje.`
  );

  if (!envio.success) {
    log("error", `[AuthAlumno] No se pudo enviar OTP a ${numero}: ${envio.error ?? "sin detalle"}`);
    res.status(502).json({ error: "No pudimos enviarte el código por WhatsApp. Verificá el número e intentá de nuevo." });
    return;
  }

  res.json({ ok: true, mensaje: `Código enviado por WhatsApp. Vence en ${OTP_EXPIRA_MINUTOS} minutos.` });
});

// POST /api/auth/alumno/otp/verificar — valida el código; crea la cuenta si no existe
router.post("/otp/verificar", rateLimitLogin, async (req: Request, res: Response) => {
  const { whatsapp, codigo, nombre } = req.body as {
    whatsapp?: string;
    codigo?: string;
    nombre?: string;
  };

  const numero = whatsapp ? normalizarWhatsapp(whatsapp) : null;
  if (!numero || !codigo || !/^\d{6}$/.test(codigo)) {
    res.status(400).json({ error: "whatsapp y codigo (6 dígitos) son requeridos" });
    return;
  }

  const otp = await prisma.otpCode.findFirst({
    where: { whatsapp: numero, usado: false, expiraEn: { gt: new Date() } },
    orderBy: { creadoEn: "desc" },
  });

  const valido = otp ? await bcrypt.compare(codigo, otp.codigoHash) : false;
  if (!otp || !valido) {
    res.status(401).json({ error: "Código incorrecto o vencido. Pedí uno nuevo." });
    return;
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usado: true } });

  let alumno = await prisma.alumno.findUnique({ where: { whatsapp: numero } });
  let esNuevo = false;
  if (!alumno) {
    alumno = await prisma.alumno.create({
      data: {
        carnet: generarCarnetWeb(),
        nombre: nombre?.trim() || "Alumno",
        apellido: "",
        whatsapp: numero,
        primerLogin: false,
        activo: true,
      },
    });
    esNuevo = true;
  }

  if (!alumno.activo) {
    res.status(401).json({ error: "Cuenta inactiva. Escribinos por WhatsApp." });
    return;
  }

  const token = firmarSesion(alumno, res);
  if (!token) return;

  res.json({
    token,
    esNuevo,
    primerLogin: false,
    alumno: {
      id: alumno.id,
      email: alumno.email,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      carnet: alumno.carnet,
    },
  });
});

export default router;
