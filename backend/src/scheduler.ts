import cron from "node-cron";
import prisma from "./lib/prisma";
import { sendWhatsAppMessage } from "./lib/whatsapp-send";
import { log } from "./lib/logger";

const TZ = "America/Guatemala";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" });
}

// Cron 1 — recordatorio 5 días antes (08:00 GT)
cron.schedule("0 8 * * *", async () => {
  log("info", "[Scheduler] Recordatorio 5 días — iniciando");
  try {
    const target = startOfDay(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
    const nextDay = new Date(target.getTime() + 24 * 60 * 60 * 1000);

    const cuotas = await prisma.cuotaPago.findMany({
      where: { estado: "PENDIENTE", fechaVence: { gte: target, lt: nextDay } },
      include: {
        pago: {
          include: {
            inscripcion: {
              include: {
                alumno: true,
                edicion: { include: { curso: true } },
              },
            },
          },
        },
      },
    });

    log("info", `[Scheduler] Recordatorio 5 días — ${cuotas.length} cuota(s)`);

    for (const cuota of cuotas) {
      const alumno = cuota.pago.inscripcion.alumno;
      const curso  = cuota.pago.inscripcion.edicion.curso.nombre;
      const whatsapp = alumno.whatsapp;
      if (!whatsapp) continue;

      const phone = whatsapp.replace(/\D/g, "");
      await sendWhatsAppMessage(
        phone,
        `⏰ Hola ${alumno.nombre}, tu cuota del curso *${curso}* vence el *${fmtFecha(cuota.fechaVence)}*.\n\n💰 Monto: *Q${Number(cuota.monto).toFixed(2)}*\n\nRecuerda realizar tu pago a tiempo. 🙏`
      ).catch((err) => log("error", `[Scheduler] Error enviando a ${phone}:`, err));
    }
  } catch (err) {
    log("error", "[Scheduler] Error en recordatorio 5 días:", err);
  }
}, { timezone: TZ });

// Cron 2 — recordatorio urgente el día del vencimiento (08:00 GT)
cron.schedule("0 8 * * *", async () => {
  log("info", "[Scheduler] Recordatorio urgente (hoy) — iniciando");
  try {
    const hoy     = startOfDay(new Date());
    const manana  = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);

    const cuotas = await prisma.cuotaPago.findMany({
      where: { estado: "PENDIENTE", fechaVence: { gte: hoy, lt: manana } },
      include: {
        pago: {
          include: {
            inscripcion: {
              include: {
                alumno: true,
                edicion: { include: { curso: true } },
              },
            },
          },
        },
      },
    });

    log("info", `[Scheduler] Recordatorio urgente — ${cuotas.length} cuota(s)`);

    for (const cuota of cuotas) {
      const alumno   = cuota.pago.inscripcion.alumno;
      const curso    = cuota.pago.inscripcion.edicion.curso.nombre;
      const whatsapp = alumno.whatsapp;
      if (!whatsapp) continue;

      const phone = whatsapp.replace(/\D/g, "");
      await sendWhatsAppMessage(
        phone,
        `🚨 *URGENTE* — Hola ${alumno.nombre}, tu cuota del curso *${curso}* vence *HOY*.\n\n💰 Monto: *Q${Number(cuota.monto).toFixed(2)}*\n\nPor favor realiza tu pago hoy para evitar recargos. Cualquier consulta escríbenos aquí.`
      ).catch((err) => log("error", `[Scheduler] Error enviando urgente a ${phone}:`, err));
    }
  } catch (err) {
    log("error", "[Scheduler] Error en recordatorio urgente:", err);
  }
}, { timezone: TZ });

// Cron 3 — marcar vencidas y notificar (09:00 GT)
cron.schedule("0 9 * * *", async () => {
  log("info", "[Scheduler] Procesador de cuotas vencidas — iniciando");
  try {
    const hoy = startOfDay(new Date());

    const vencidas = await prisma.cuotaPago.findMany({
      where: { estado: "PENDIENTE", fechaVence: { lt: hoy } },
      include: {
        pago: {
          include: {
            inscripcion: {
              include: {
                alumno: true,
                edicion: { include: { curso: true } },
              },
            },
          },
        },
      },
    });

    log("info", `[Scheduler] Cuotas vencidas a procesar: ${vencidas.length}`);

    for (const cuota of vencidas) {
      await prisma.cuotaPago.update({
        where: { id: cuota.id },
        data: { estado: "VENCIDO" },
      }).catch((err) => log("error", `[Scheduler] Error actualizando cuota ${cuota.id}:`, err));

      const alumno   = cuota.pago.inscripcion.alumno;
      const curso    = cuota.pago.inscripcion.edicion.curso.nombre;
      const whatsapp = alumno.whatsapp;
      if (!whatsapp) continue;

      const phone = whatsapp.replace(/\D/g, "");
      await sendWhatsAppMessage(
        phone,
        `❌ Hola ${alumno.nombre}, tu cuota del curso *${curso}* está *VENCIDA* desde el ${fmtFecha(cuota.fechaVence)}.\n\n💰 Monto pendiente: *Q${Number(cuota.monto).toFixed(2)}*\n\nPor favor contáctanos para regularizar tu situación.`
      ).catch((err) => log("error", `[Scheduler] Error enviando vencida a ${phone}:`, err));
    }

    log("info", `[Scheduler] Procesador vencidas — ${vencidas.length} cuota(s) actualizadas`);
  } catch (err) {
    log("error", "[Scheduler] Error en procesador de vencidas:", err);
  }
}, { timezone: TZ });

export function startScheduler(): void {
  log("info", "[Scheduler] Iniciado — 3 cron jobs registrados (TZ: America/Guatemala)");
}
