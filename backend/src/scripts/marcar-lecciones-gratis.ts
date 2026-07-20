// Marca esGratis en las lecciones de prueba del funnel: SIEMPRE las primeras
// N lecciones de CADA ruta completa, en el orden real en que se muestran
// (RutaLeccion.orden) — nunca agrupado por nivel. Antes "general" marcaba
// las primeras 3 de CADA nivel (A1, A2, B1...), lo que dejaba lecciones
// gratis dispersas por todo el curso (una tanda cerca del final, en C1).
// Ahora es consistente con las demás rutas: las primeras N y nada más.
//
// Autoritativo, no solo aditivo: una lección que ya no cae en las primeras
// N de NINGUNA de sus rutas se desmarca. Una lección compartida entre rutas
// (vía RutaLeccion) queda gratis si está entre las primeras N en AL MENOS
// una de ellas.

import prisma from "../lib/prisma";

const GRATIS_POR_RUTA = 3;

async function main() {
  const rutas = await prisma.ruta.findMany({
    where: { publicada: true },
    include: {
      lecciones: {
        orderBy: { orden: "asc" },
        include: { leccion: { select: { id: true, titulo: true } } },
      },
    },
    orderBy: { orden: "asc" },
  });

  const idsGratisCorrectos = new Set<number>();

  for (const ruta of rutas) {
    const primeras = ruta.lecciones.slice(0, GRATIS_POR_RUTA);
    for (const rl of primeras) idsGratisCorrectos.add(rl.leccion.id);
    console.log(`${ruta.slug}: ${primeras.map((rl) => rl.leccion.titulo).join(" | ")}`);
  }

  const marcarGratis = await prisma.leccion.updateMany({
    where: { id: { in: [...idsGratisCorrectos] }, esGratis: false },
    data: { esGratis: true },
  });
  const desmarcar = await prisma.leccion.updateMany({
    where: { id: { notIn: [...idsGratisCorrectos] }, esGratis: true },
    data: { esGratis: false },
  });

  const totalGratis = await prisma.leccion.count({ where: { esGratis: true } });
  console.log(
    `\nMarcadas gratis: +${marcarGratis.count}. Desmarcadas (ya no eran "primeras N"): -${desmarcar.count}.`
  );
  console.log(`Total lecciones gratis en la plataforma ahora: ${totalGratis} (esperado: ~${rutas.length * GRATIS_POR_RUTA}, puede ser menor por lecciones compartidas entre rutas).`);
}

main().finally(() => prisma.$disconnect());
