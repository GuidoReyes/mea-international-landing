// Marca esGratis en las lecciones de prueba del funnel:
//  - Ruta "general" (A1→C1): las primeras 3 lecciones DE CADA NIVEL (15 en total),
//    para que cada nivel se pueda probar gratis, no solo A1.
//  - Rutas vocacionales: las primeras 3 de cada una.
// Idempotente. Una lección compartida entre rutas queda gratis en todas.

import prisma from "../lib/prisma";

const GRATIS_POR_GRUPO = 3;

async function main() {
  const rutas = await prisma.ruta.findMany({
    where: { publicada: true },
    include: {
      lecciones: {
        orderBy: { orden: "asc" },
        include: {
          leccion: {
            select: { id: true, titulo: true, esGratis: true, capitulo: { select: { nivel: true } } },
          },
        },
      },
    },
    orderBy: { orden: "asc" },
  });

  let marcadas = 0;
  for (const ruta of rutas) {
    // En "general" el grupo es el nivel del capítulo; en las demás, la ruta entera.
    const porGrupo = new Map<string, typeof ruta.lecciones>();
    for (const rl of ruta.lecciones) {
      const grupo = ruta.slug === "general" ? rl.leccion.capitulo.nivel : "unica";
      if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
      porGrupo.get(grupo)!.push(rl);
    }

    for (const [grupo, leccionesGrupo] of porGrupo) {
      const primeras = leccionesGrupo.slice(0, GRATIS_POR_GRUPO);
      const pendientes = primeras.filter((rl) => !rl.leccion.esGratis);
      for (const rl of pendientes) {
        await prisma.leccion.update({ where: { id: rl.leccion.id }, data: { esGratis: true } });
        marcadas++;
      }
      const etiqueta = grupo === "unica" ? ruta.slug : `${ruta.slug}/${grupo}`;
      console.log(
        `${etiqueta}: ${primeras.length} gratis (${pendientes.length} nuevas) → ${primeras
          .map((rl) => rl.leccion.titulo)
          .join(" | ")}`
      );
    }
  }

  const totalGratis = await prisma.leccion.count({ where: { esGratis: true } });
  console.log(`\nMarcadas ahora: ${marcadas}. Total lecciones gratis en la plataforma: ${totalGratis}.`);
}

main().finally(() => prisma.$disconnect());
