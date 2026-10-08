/**
 * Backfill de una sola vez para R9 (PRD mea-logica-negocio): aplica la misma
 * regla de match (telefono/email exacto, ver lib/lead-alumno.ts) a los
 * Alumno que ya existian antes de este feature, para que el reporte de
 * conversion por campana/etapa no arranque en cero. Idempotente -- solo
 * actualiza Lead con alumnoId todavia null, se puede correr mas de una vez
 * sin duplicar nada.
 * Uso: railway run node -r ts-node/register/transpile-only src/scripts/backfill-lead-alumno.ts
 */
import prisma from "../lib/prisma";
import { vincularLeadConAlumnoNuevo } from "../lib/lead-alumno";

async function main(): Promise<void> {
  const alumnos = await prisma.alumno.findMany({
    select: { id: true, email: true, whatsapp: true },
  });

  console.log(`Revisando ${alumnos.length} alumno(s) contra leads sin convertir...`);

  let enlazados = 0;
  for (const alumno of alumnos) {
    const antes = await prisma.lead.count({ where: { alumnoId: alumno.id } });
    await vincularLeadConAlumnoNuevo(alumno);
    const despues = await prisma.lead.count({ where: { alumnoId: alumno.id } });
    if (despues > antes) enlazados += 1;
  }

  console.log(`Listo: ${enlazados} lead(s) enlazado(s) retroactivamente.`);
}

main()
  .catch((err) => {
    console.error("Error en backfill-lead-alumno:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
