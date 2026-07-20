/**
 * Fix puntual: seed-curriculum-500.ts creó los RutaLeccion de las 259
 * lecciones nuevas sin setear "orden" (quedó en el default 0), lo que las
 * ordenaba ANTES de la lección 1 original en cada ruta en vez de después.
 *
 * Reasigna orden secuencial a los RutaLeccion en orden=0 de cada ruta,
 * continuando desde el máximo orden ya existente (>0), en el mismo orden
 * en que se sembraron (Leccion.id ascendente refleja el orden del roster
 * de seed-curriculum-500.ts: por curso, por capítulo, por lección).
 *
 * Idempotente: si ya no hay ningún RutaLeccion en orden=0, no hace nada.
 */
import prisma from "../lib/prisma";

async function main(): Promise<void> {
  const rutas = await prisma.ruta.findMany({ where: { publicada: true } });
  let totalCorregidos = 0;

  for (const ruta of rutas) {
    const maxOrdenRow = await prisma.rutaLeccion.aggregate({
      where: { rutaId: ruta.id, orden: { gt: 0 } },
      _max: { orden: true },
    });
    let siguienteOrden = (maxOrdenRow._max.orden ?? 0) + 1;

    const enCero = await prisma.rutaLeccion.findMany({
      where: { rutaId: ruta.id, orden: 0 },
      orderBy: { leccionId: "asc" },
    });

    if (enCero.length === 0) continue;

    for (const rl of enCero) {
      await prisma.rutaLeccion.update({
        where: { rutaId_leccionId: { rutaId: ruta.id, leccionId: rl.leccionId } },
        data: { orden: siguienteOrden },
      });
      siguienteOrden += 1;
    }

    console.log(`${ruta.slug}: ${enCero.length} RutaLeccion corregidos (orden 0 → secuencial desde ${(maxOrdenRow._max.orden ?? 0) + 1}).`);
    totalCorregidos += enCero.length;
  }

  console.log(`\nTotal corregidos: ${totalCorregidos}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
