// Marca esGratis en las lecciones de prueba del funnel: las primeras N
// lecciones de CADA NIVEL (A1, A2, B1, B2, C1) dentro de cada ruta, en el
// orden real en que se muestran (RutaLeccion.orden) — así cada nivel tiene
// su propia vidriera gratis, no solo el arranque de la ruta completa.
//
// Autoritativo, no solo aditivo: una lección que ya no cae en las primeras
// N de NINGÚN (ruta, nivel) se desmarca. Una lección compartida entre rutas
// (vía RutaLeccion) queda gratis si está entre las primeras N en AL MENOS
// una de ellas.

import prisma from "../lib/prisma";

const GRATIS_POR_NIVEL = 3;

async function main() {
  const rutas = await prisma.ruta.findMany({
    where: { publicada: true },
    include: {
      lecciones: {
        orderBy: { orden: "asc" },
        include: {
          leccion: { select: { id: true, titulo: true, capitulo: { select: { nivel: true } } } },
        },
      },
    },
    orderBy: { orden: "asc" },
  });

  const idsGratisCorrectos = new Set<number>();

  for (const ruta of rutas) {
    const porNivel = new Map<string, typeof ruta.lecciones>();
    for (const rl of ruta.lecciones) {
      const nivel = rl.leccion.capitulo.nivel;
      if (!porNivel.has(nivel)) porNivel.set(nivel, []);
      porNivel.get(nivel)!.push(rl);
    }

    for (const [nivel, leccionesNivel] of porNivel) {
      const primeras = leccionesNivel.slice(0, GRATIS_POR_NIVEL);
      for (const rl of primeras) idsGratisCorrectos.add(rl.leccion.id);
      console.log(`${ruta.slug}/${nivel}: ${primeras.map((rl) => rl.leccion.titulo).join(" | ")}`);
    }
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
  console.log(`Total lecciones gratis en la plataforma ahora: ${totalGratis}.`);
}

main().finally(() => prisma.$disconnect());
