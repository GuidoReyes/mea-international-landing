/**
 * Audita inscripciones/pagos atascados que dejan a un alumno sin acceso sin que
 * nadie se entere: cuentas creadas que nunca intentaron pagar, depósitos subidos
 * que nadie confirmó, y coordinaciones por WhatsApp que nadie retomó.
 *
 * Uso:
 *   npx ts-node src/scripts/auditar-inscripciones-pendientes.ts
 */
import prisma from "../lib/prisma";

const HORAS_UMBRAL = 24;
const MS_UMBRAL = HORAS_UMBRAL * 60 * 60 * 1000;

function nombreAlumno(a: { nombre: string; apellido: string; email: string | null; whatsapp: string | null; carnet: string }): string {
  const contacto = a.email ?? a.whatsapp ?? "sin contacto";
  return `${a.nombre} ${a.apellido} (${a.carnet}) — ${contacto}`;
}

async function main(): Promise<void> {
  const corte = new Date(Date.now() - MS_UMBRAL);

  console.log(`── Auditoría de inscripciones pendientes (corte: más de ${HORAS_UMBRAL}h) ──\n`);

  // 1. Alumnos sin ninguna Suscripcion — nunca intentaron pagar.
  const sinSuscripcion = await prisma.alumno.findMany({
    where: {
      activo: true,
      creadoEn: { lt: corte },
      suscripciones: { none: {} },
    },
    select: { nombre: true, apellido: true, email: true, whatsapp: true, carnet: true, creadoEn: true },
    orderBy: { creadoEn: "desc" },
  });

  console.log(`1) Alumnos registrados sin ninguna suscripción (${sinSuscripcion.length}):`);
  for (const a of sinSuscripcion) {
    console.log(`   - ${nombreAlumno(a)} — registrado ${a.creadoEn.toISOString()}`);
  }

  // 2. Suscripciones PENDIENTE con un PagoSuscripcion también PENDIENTE (subieron
  //    comprobante, nadie lo confirmó en /admin/pagos-deposito).
  const conComprobantePendiente = await prisma.suscripcion.findMany({
    where: {
      estado: "PENDIENTE",
      creadoEn: { lt: corte },
      pagos: { some: { estado: "PENDIENTE" } },
    },
    include: {
      alumno: { select: { nombre: true, apellido: true, email: true, whatsapp: true, carnet: true } },
      planPrecio: { include: { plan: { select: { nombre: true } } } },
    },
    orderBy: { creadoEn: "desc" },
  });

  console.log(`\n2) Comprobantes de depósito sin confirmar (${conComprobantePendiente.length}) — revisar en /admin/pagos-deposito:`);
  for (const s of conComprobantePendiente) {
    console.log(`   - ${nombreAlumno(s.alumno)} — plan ${s.planPrecio.plan.nombre} — desde ${s.creadoEn.toISOString()}`);
  }

  // 3. Suscripciones PENDIENTE sin ningún PagoSuscripcion (coordinaron por
  //    WhatsApp, proveedor "manual_whatsapp", nadie les dio seguimiento).
  const coordinandoWhatsapp = await prisma.suscripcion.findMany({
    where: {
      estado: "PENDIENTE",
      creadoEn: { lt: corte },
      pagos: { none: {} },
    },
    include: {
      alumno: { select: { nombre: true, apellido: true, email: true, whatsapp: true, carnet: true } },
      planPrecio: { include: { plan: { select: { nombre: true } } } },
    },
    orderBy: { creadoEn: "desc" },
  });

  console.log(`\n3) Coordinando por WhatsApp sin seguimiento (${coordinandoWhatsapp.length}):`);
  for (const s of coordinandoWhatsapp) {
    console.log(`   - ${nombreAlumno(s.alumno)} — plan ${s.planPrecio.plan.nombre} — desde ${s.creadoEn.toISOString()}`);
  }

  console.log(`\n── Total casos a revisar: ${sinSuscripcion.length + conComprobantePendiente.length + coordinandoWhatsapp.length} ──`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
