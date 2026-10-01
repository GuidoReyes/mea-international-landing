/**
 * Diagnostico puntual de solo lectura: por que un alumno no puede jugar sus
 * lecciones pagas. Replica exactamente la logica de tieneSuscripcionActiva
 * (lib/suscripciones.ts) para los emails dados y muestra el detalle de sus
 * suscripciones y pagos (online) y, por si se inscribieron por error del
 * lado presencial, sus Inscripcion/Pago tambien. No modifica nada, no
 * imprime DATABASE_URL ni contrasenas.
 * Uso: railway run node -r ts-node/register/transpile-only src/scripts/diagnostico-acceso-alumno.ts correo1@ej.com correo2@ej.com
 */
import prisma from "../lib/prisma";

const EMAILS = process.argv.slice(2);

if (EMAILS.length === 0) {
  console.error("Uso: diagnostico-acceso-alumno.ts <email1> [email2] ...");
  process.exit(1);
}

async function main(): Promise<void> {
  for (const email of EMAILS) {
    console.log(`\n=== ${email} ===`);

    const alumno = await prisma.alumno.findUnique({
      where: { email },
      select: { id: true, nombre: true, apellido: true, activo: true, whatsapp: true },
    });

    if (!alumno) {
      console.log("No existe ningun Alumno con este email.");
      continue;
    }

    console.log(
      `Alumno #${alumno.id} — ${alumno.nombre} ${alumno.apellido} — activo=${alumno.activo} — whatsapp=${
        alumno.whatsapp ? "si" : "no"
      }`
    );

    const suscripciones = await prisma.suscripcion.findMany({
      where: { alumnoId: alumno.id },
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        estado: true,
        proveedor: true,
        fechaInicio: true,
        fechaFin: true,
        creadoEn: true,
        planPrecio: { select: { plan: { select: { nombre: true } } } },
        pagos: {
          orderBy: { creadoEn: "desc" },
          select: { id: true, estado: true, montoCentavos: true, mesPagado: true, pagadoEn: true, creadoEn: true },
        },
      },
    });

    if (suscripciones.length === 0) {
      console.log("Sin ninguna Suscripcion (online) registrada.");
    }

    const ahora = new Date();
    for (const s of suscripciones) {
      const vigente = s.fechaFin === null || s.fechaFin > ahora;
      const desbloquea = s.estado === "ACTIVA" && vigente;
      console.log(
        `  Suscripcion #${s.id} [${s.planPrecio.plan.nombre}] estado=${s.estado} proveedor=${s.proveedor} ` +
          `inicio=${s.fechaInicio?.toISOString() ?? "null"} fin=${s.fechaFin?.toISOString() ?? "null (sin vencimiento)"} ` +
          `=> ${desbloquea ? "DESBLOQUEA contenido" : "NO desbloquea"}`
      );
      for (const p of s.pagos) {
        console.log(
          `    Pago #${p.id} estado=${p.estado} mes=${p.mesPagado ?? "-"} monto=${p.montoCentavos / 100} ` +
            `pagadoEn=${p.pagadoEn?.toISOString() ?? "null"} creado=${p.creadoEn.toISOString()}`
        );
      }
    }

    // Por si se inscribieron del lado presencial (Inscripcion/Edicion) en vez
    // de contratar la suscripcion online -- no desbloquea lecciones, pero
    // explicaria por que creen que ya tienen "permiso".
    const inscripcionesPresenciales = await prisma.inscripcion.findMany({
      where: { alumnoId: alumno.id },
      select: {
        id: true,
        estado: true,
        edicion: { select: { nombre: true, curso: { select: { nombre: true } } } },
        pagos: { select: { id: true, estado: true, monto: true } },
      },
    });

    if (inscripcionesPresenciales.length > 0) {
      console.log("  (Presencial) Inscripciones encontradas:");
      for (const i of inscripcionesPresenciales) {
        console.log(
          `    Inscripcion #${i.id} curso="${i.edicion.curso.nombre}" edicion="${i.edicion.nombre}" estado=${i.estado}`
        );
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Error en el diagnostico:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
