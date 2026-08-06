import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { agregarMeses } from "../lib/recurrente";
import { sendWhatsAppMessage } from "../lib/whatsapp-send";
import { inscribirEnCursosPublicados } from "../lib/suscripciones";
import { log } from "../lib/logger";

const router = Router();

// GET /api/pagos-deposito — lista comprobantes de depósito, filtrable por estado
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const { estado } = req.query as { estado?: string };

  const pagos = await prisma.pagoSuscripcion.findMany({
    where: {
      proveedor: "deposito_bi",
      ...(estado ? { estado: estado as never } : {}),
    },
    orderBy: { creadoEn: "desc" },
    include: {
      suscripcion: {
        include: {
          alumno: { select: { nombre: true, apellido: true, carnet: true, email: true } },
          planPrecio: { include: { plan: { select: { nombre: true } } } },
        },
      },
    },
  });

  res.json(
    pagos.map((p) => ({
      id: p.id,
      estado: p.estado,
      montoCentavos: p.montoCentavos,
      moneda: p.moneda,
      mesPagado: p.mesPagado,
      comprobanteUrl: p.comprobanteUrl,
      creadoEn: p.creadoEn,
      pagadoEn: p.pagadoEn,
      alumno: p.suscripcion.alumno,
      plan: p.suscripcion.planPrecio.plan.nombre,
      suscripcionId: p.suscripcionId,
    }))
  );
});

// PATCH /api/pagos-deposito/:id/confirmar — confirma el depósito y activa la suscripción
router.patch(
  "/:id/confirmar",
  verifyJWT,
  auditLog("CONFIRMAR_PAGO_DEPOSITO", "pagos-deposito"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const pago = await prisma.pagoSuscripcion.findUnique({
      where: { id },
      include: {
        suscripcion: { include: { planPrecio: true, alumno: true } },
      },
    });

    if (!pago || pago.proveedor !== "deposito_bi") {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    if (pago.estado === "COMPLETADO") {
      res.status(409).json({ error: "Este pago ya fue confirmado" });
      return;
    }

    const ahora = new Date();
    const fechaFin = agregarMeses(ahora, pago.suscripcion.planPrecio.duracionMeses);

    await prisma.$transaction([
      prisma.pagoSuscripcion.update({
        where: { id: pago.id },
        data: { estado: "COMPLETADO", pagadoEn: ahora },
      }),
      prisma.suscripcion.update({
        where: { id: pago.suscripcion.id },
        data: { estado: "ACTIVA", fechaInicio: ahora, fechaFin },
      }),
    ]);

    log("info", `[PagosDeposito] Pago ${pago.id} confirmado, suscripción ${pago.suscripcion.id} activa hasta ${fechaFin.toISOString()}`);

    await inscribirEnCursosPublicados(pago.suscripcion.alumnoId);

    if (pago.suscripcion.alumno.whatsapp) {
      const mensaje =
        `¡Hola ${pago.suscripcion.alumno.nombre}! Confirmamos tu depósito y tu plan ya está activo. ` +
        `Entrá a tus cursos en https://www.mea.edu.gt/mis-cursos 🎓`;
      sendWhatsAppMessage(pago.suscripcion.alumno.whatsapp, mensaje).catch((err) =>
        log("error", "[PagosDeposito] Error enviando WhatsApp de confirmación:", err)
      );
    }

    res.json({ ok: true, fechaFin });
  }
);

// PATCH /api/pagos-deposito/:id/rechazar — marca el comprobante como rechazado
router.patch(
  "/:id/rechazar",
  verifyJWT,
  auditLog("RECHAZAR_PAGO_DEPOSITO", "pagos-deposito"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const pago = await prisma.pagoSuscripcion.findUnique({ where: { id } });
    if (!pago || pago.proveedor !== "deposito_bi") {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    await prisma.pagoSuscripcion.update({
      where: { id: pago.id },
      data: { estado: "RECHAZADO" },
    });

    res.json({ ok: true });
  }
);

export default router;
