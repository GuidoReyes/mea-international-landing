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

// Al activarse una suscripción, inscribe al alumno en todos los CursoOnline
// publicados (idempotente). Sin esto, /mis-cursos muestra "no inscrito en
// ningún curso" hasta que el alumno completa una lección por su cuenta,
// aunque el contenido ya esté desbloqueado por la suscripción activa.
export async function inscribirEnCursosPublicados(alumnoId: number): Promise<void> {
  const cursos = await prisma.cursoOnline.findMany({
    where: { publicado: true },
    select: { id: true },
  });

  await prisma.$transaction(
    cursos.map((curso) =>
      prisma.inscripcionOnline.upsert({
        where: { alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId: curso.id } },
        create: { alumnoId, cursoOnlineId: curso.id },
        update: {},
      })
    )
  );
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
