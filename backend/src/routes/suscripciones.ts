import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import prisma from "../lib/prisma";
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { isRecurrenteConfigurado, crearCheckoutRecurrente } from "../lib/recurrente";
import { subirComprobanteDeposito, isDriveConfigured } from "../lib/drive-comprobantes";
import { log } from "../lib/logger";

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const CUENTA_DEPOSITO = {
  banco: "Banco Industrial",
  nombreCuenta: "Corporacion ME",
  tipoCuenta: "Cuenta monetaria BI",
  numeroCuenta: "GTQ-6930015505",
};

function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}

const CHECKOUT_MAX_POR_MINUTO = 5;
const CHECKOUT_WINDOW_MS = 60_000;
const checkoutAttempts = new Map<number, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of checkoutAttempts.entries()) {
    if (entry.resetAt < now) checkoutAttempts.delete(key);
  }
}, 300_000);

function rateLimitCheckout(req: Request, res: Response, next: NextFunction): void {
  const alumnoId = req.alumno!.alumnoId;
  const now = Date.now();
  const entry = checkoutAttempts.get(alumnoId);

  if (!entry || entry.resetAt < now) {
    checkoutAttempts.set(alumnoId, { count: 1, resetAt: now + CHECKOUT_WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > CHECKOUT_MAX_POR_MINUTO) {
    res.status(429).json({ error: "Demasiados intentos de checkout. Esperá un minuto." });
    return;
  }
  next();
}

// POST /api/suscripciones/checkout — crea suscripción PENDIENTE y devuelve link de pago
router.post("/checkout", verifyAlumnoJWT, rateLimitCheckout, async (req: Request, res: Response) => {
  if (!isRecurrenteConfigurado()) {
    res.status(503).json({
      error: "El pago en línea todavía no está disponible. Escribinos por WhatsApp para activar tu plan.",
    });
    return;
  }

  const { planPrecioId } = req.body as { planPrecioId?: number };
  if (!planPrecioId || !Number.isInteger(planPrecioId)) {
    res.status(400).json({ error: "planPrecioId requerido" });
    return;
  }

  const planPrecio = await prisma.planPrecio.findUnique({
    where: { id: planPrecioId },
    include: { plan: true },
  });
  if (!planPrecio) {
    res.status(404).json({ error: "Precio de plan no encontrado" });
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { id: req.alumno!.alumnoId } });
  if (!alumno || !alumno.activo) {
    res.status(401).json({ error: "Cuenta inactiva" });
    return;
  }

  if (!alumno.email) {
    res.status(400).json({
      error: "Completá tu correo en tu perfil para pagar en línea (lo usa la pasarela de pago).",
    });
    return;
  }

  const suscripcion = await prisma.suscripcion.create({
    data: {
      alumnoId: alumno.id,
      planPrecioId: planPrecio.id,
      estado: "PENDIENTE",
      proveedor: "recurrente",
    },
  });

  try {
    const checkout = await crearCheckoutRecurrente({
      nombre: `Plan ${planPrecio.plan.nombre} — ${planPrecio.duracionMeses} ${planPrecio.duracionMeses === 1 ? "mes" : "meses"}`,
      descripcion: planPrecio.plan.descripcion,
      montoCentavos: planPrecio.precioTotalCentavos,
      moneda: planPrecio.moneda,
      suscripcionId: suscripcion.id,
      emailAlumno: alumno.email,
    });

    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { idExterno: checkout.checkoutId },
    });

    res.json({ checkoutUrl: checkout.checkoutUrl, suscripcionId: suscripcion.id });
  } catch (err) {
    log("error", "[Suscripciones] Error creando checkout Recurrente:", err);
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { estado: "CANCELADA" },
    });
    res.status(502).json({ error: "No se pudo generar el link de pago. Intentá de nuevo o escribinos por WhatsApp." });
  }
});

// POST /api/suscripciones/checkout-manual — crea suscripción PENDIENTE para pago por
// depósito, o solo deja constancia de intención cuando el alumno elige coordinar por
// WhatsApp (via="whatsapp") — antes ese camino no dejaba ningún rastro en la base y un
// alumno podía quedar "coordinando" indefinidamente sin que nadie le diera seguimiento.
router.post("/checkout-manual", verifyAlumnoJWT, rateLimitCheckout, async (req: Request, res: Response) => {
  const { planPrecioId, via } = req.body as { planPrecioId?: number; via?: "deposito" | "whatsapp" };
  if (!planPrecioId || !Number.isInteger(planPrecioId)) {
    res.status(400).json({ error: "planPrecioId requerido" });
    return;
  }

  const planPrecio = await prisma.planPrecio.findUnique({
    where: { id: planPrecioId },
    include: { plan: true },
  });
  if (!planPrecio) {
    res.status(404).json({ error: "Precio de plan no encontrado" });
    return;
  }

  const alumno = await prisma.alumno.findUnique({ where: { id: req.alumno!.alumnoId } });
  if (!alumno || !alumno.activo) {
    res.status(401).json({ error: "Cuenta inactiva" });
    return;
  }

  if (via === "whatsapp") {
    const suscripcion = await prisma.suscripcion.create({
      data: {
        alumnoId: alumno.id,
        planPrecioId: planPrecio.id,
        estado: "PENDIENTE",
        proveedor: "manual_whatsapp",
      },
    });
    res.json({ suscripcionId: suscripcion.id });
    return;
  }

  const suscripcion = await prisma.suscripcion.create({
    data: {
      alumnoId: alumno.id,
      planPrecioId: planPrecio.id,
      estado: "PENDIENTE",
      proveedor: "manual_deposito",
    },
  });

  const pago = await prisma.pagoSuscripcion.create({
    data: {
      suscripcionId: suscripcion.id,
      montoCentavos: planPrecio.precioTotalCentavos,
      moneda: planPrecio.moneda,
      estado: "PENDIENTE",
      proveedor: "deposito_bi",
    },
  });

  res.json({ suscripcionId: suscripcion.id, pagoId: pago.id, cuenta: CUENTA_DEPOSITO });
});

// POST /api/suscripciones/pagos/:pagoId/comprobante — sube la boleta de depósito a Drive
router.post(
  "/pagos/:pagoId/comprobante",
  verifyAlumnoJWT,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!isDriveConfigured()) {
      res.status(503).json({
        error: "La subida de comprobantes todavía no está disponible. Escribinos por WhatsApp.",
      });
      return;
    }

    const pagoId = parseInt(req.params["pagoId"] as string, 10);
    if (isNaN(pagoId)) {
      res.status(400).json({ error: "pagoId inválido" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Archivo de comprobante requerido" });
      return;
    }

    const pago = await prisma.pagoSuscripcion.findUnique({
      where: { id: pagoId },
      include: { suscripcion: { include: { alumno: true } } },
    });

    if (!pago || pago.suscripcion.alumnoId !== req.alumno!.alumnoId) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    const { mesPagado } = req.body as { mesPagado?: string };
    const mes = mesPagado && /^\d{4}-\d{2}$/.test(mesPagado) ? mesPagado : mesActual();
    const alumno = pago.suscripcion.alumno;
    const extension = req.file.originalname.split(".").pop() ?? "jpg";

    try {
      const comprobante = await subirComprobanteDeposito({
        alumnoNombre: alumno.nombre,
        alumnoApellido: alumno.apellido,
        alumnoCarnet: alumno.carnet,
        mes,
        buffer: req.file.buffer,
        nombreArchivo: `boleta-${Date.now()}.${extension}`,
        mimeType: req.file.mimetype,
      });

      await prisma.pagoSuscripcion.update({
        where: { id: pago.id },
        data: {
          comprobanteUrl: comprobante.url,
          comprobanteDriveId: comprobante.driveFileId,
          mesPagado: mes,
        },
      });

      res.json({ ok: true, comprobanteUrl: comprobante.url });
    } catch (err) {
      log("error", "[Suscripciones] Error subiendo comprobante a Drive:", err);
      res.status(502).json({ error: "No se pudo subir el comprobante. Intentá de nuevo." });
    }
  }
);

// GET /api/suscripciones/me — suscripción vigente (o la más reciente) del alumno
router.get("/me", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: { alumnoId: req.alumno!.alumnoId },
    orderBy: { creadoEn: "desc" },
    include: {
      planPrecio: {
        include: { plan: { select: { nombre: true, slug: true } } },
      },
    },
  });

  if (!suscripcion) {
    res.json({ suscripcion: null, activa: false });
    return;
  }

  const vigente =
    suscripcion.estado === "ACTIVA" &&
    (suscripcion.fechaFin === null || suscripcion.fechaFin > new Date());

  res.json({
    suscripcion: {
      id: suscripcion.id,
      estado: suscripcion.estado,
      proveedor: suscripcion.proveedor,
      fechaInicio: suscripcion.fechaInicio,
      fechaFin: suscripcion.fechaFin,
      plan: suscripcion.planPrecio.plan,
      duracionMeses: suscripcion.planPrecio.duracionMeses,
    },
    activa: vigente,
  });
});

export default router;
