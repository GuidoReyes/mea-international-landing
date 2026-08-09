import prisma from "../lib/prisma";

// Antes del fix en lib/suscripciones.ts (inscribirEnCursosPublicados), activar
// una suscripción desbloqueaba el contenido pero nunca creaba InscripcionOnline.
// Este backfill corrige a todos los alumnos cuya suscripción ya estaba ACTIVA
// antes de ese fix, inscribiéndolos en los cursos publicados que les falten.
async function main() {
  const ahora = new Date();

  const [cursosPublicados, alumnosConSuscripcionActiva] = await Promise.all([
    prisma.cursoOnline.findMany({ where: { publicado: true }, select: { id: true } }),
    prisma.suscripcion.findMany({
      where: {
        estado: "ACTIVA",
        OR: [{ fechaFin: null }, { fechaFin: { gt: ahora } }],
      },
      select: { alumnoId: true },
      distinct: ["alumnoId"],
    }),
  ]);

  if (cursosPublicados.length === 0 || alumnosConSuscripcionActiva.length === 0) {
    console.log("Nada que hacer: no hay cursos publicados o no hay alumnos con suscripción activa.");
    return;
  }

  const data = alumnosConSuscripcionActiva.flatMap((alumno) =>
    cursosPublicados.map((curso) => ({ alumnoId: alumno.alumnoId, cursoOnlineId: curso.id }))
  );

  const resultado = await prisma.inscripcionOnline.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Alumnos con suscripción activa: ${alumnosConSuscripcionActiva.length}`);
  console.log(`Cursos publicados: ${cursosPublicados.length}`);
  console.log(`Inscripciones nuevas creadas: ${resultado.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
