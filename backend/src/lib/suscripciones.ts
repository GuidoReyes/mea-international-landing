import prisma from "./prisma";

// Una suscripción desbloquea contenido si está ACTIVA y su fechaFin no pasó.
export async function tieneSuscripcionActiva(alumnoId: number): Promise<boolean> {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: {
      alumnoId,
      estado: "ACTIVA",
      OR: [{ fechaFin: null }, { fechaFin: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return suscripcion !== null;
}

// Igual que tieneSuscripcionActiva, pero exige además que el Plan contratado
// incluya clases en vivo (hoy solo el plan "Profesional").
export async function tieneSuscripcionConClasesEnVivo(alumnoId: number): Promise<boolean> {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: {
      alumnoId,
      estado: "ACTIVA",
      OR: [{ fechaFin: null }, { fechaFin: { gt: new Date() } }],
      planPrecio: { plan: { incluyeClasesEnVivo: true } },
    },
    select: { id: true },
  });
  return suscripcion !== null;
}
