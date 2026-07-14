// Marca esGratis en las primeras 3 lecciones (por orden de RutaLeccion) de cada
// Ruta publicada, para el funnel "probá 3 lecciones gratis" de la landing.
// Idempotente: re-correrlo no cambia nada si ya están marcadas.
// Nota: una lección compartida entre rutas queda gratis en todas (es la misma Leccion).

import prisma from "../lib/prisma";

const LECCIONES_GRATIS_POR_RUTA = 3;

async function main() {
  const rutas = await prisma.ruta.findMany({
    where: { publicada: true },
    include: {
      lecciones: {
        orderBy: { orden: "asc" },
        take: LECCIONES_GRATIS_POR_RUTA,
        include: { leccion: { select: { id: true, titulo: true, esGratis: true } } },
      },
    },
    orderBy: { orden: "asc" },
  });

  let marcadas = 0;
  for (const ruta of rutas) {
    const pendientes = ruta.lecciones.filter((rl) => !rl.leccion.esGratis);
    for (const rl of pendientes) {
      await prisma.leccion.update({ where: { id: rl.leccion.id }, data: { esGratis: true } });
      marcadas++;
    }
    const titulos = ruta.lecciones.map((rl) => rl.leccion.titulo).join(" | ");
    console.log(`${ruta.slug}: ${ruta.lecciones.length} gratis (${pendientes.length} nuevas) → ${titulos}`);
  }

  const totalGratis = await prisma.leccion.count({ where: { esGratis: true } });
  console.log(`\nMarcadas ahora: ${marcadas}. Total lecciones gratis en la plataforma: ${totalGratis}.`);
}

main().finally(() => prisma.$disconnect());
