/**
 * Diagnóstico temporal: estado de la generación de contenido de las 500 lecciones.
 * Uso: railway run npx ts-node src/scripts/tmp-estado-generacion.ts
 */
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

interface Paso {
  id: string;
  tipo: string;
  audioUrl?: string;
  imagenUrl?: string;
}

function pasosDe(content: unknown): Paso[] {
  return ((content as { pasos?: Paso[] } | null)?.pasos ?? []) as Paso[];
}

async function main(): Promise<void> {
  const total = await prisma.leccion.count();
  const todas = await prisma.leccion.findMany({
    where: { content: { not: Prisma.DbNull } },
    select: { id: true, titulo: true, content: true },
  });

  const conPasos = todas.filter((l) => pasosDe(l.content).length > 0);

  console.log(`Lecciones totales:      ${total}`);
  console.log(`Con pasos interactivos: ${conPasos.length}`);
  console.log(`Pendientes de generar:  ${total - conPasos.length}`);
  console.log(`\nIDs con pasos: ${conPasos.map((l) => l.id).join(",")}`);

  const PLACEHOLDER = "https://pending.local/audio-placeholder.wav";
  const conAudioReal = conPasos.filter((l) =>
    pasosDe(l.content).some((p) => !!p.audioUrl && !p.audioUrl.startsWith("https://pending.local"))
  );
  const conPlaceholder = conPasos.filter((l) => pasosDe(l.content).some((p) => p.audioUrl === PLACEHOLDER));
  console.log(`\nCon audio real (R2):    ${conAudioReal.length}`);
  console.log(`Con placeholder roto:   ${conPlaceholder.length} → ${conPlaceholder.map((l) => l.id).join(",")}`);

  console.log("\n── Últimas 6 lecciones generadas ──");
  for (const l of conPasos.slice(-6)) {
    const pasos = pasosDe(l.content);
    const conAudio = pasos.filter((p) => !!p.audioUrl).length;
    const vocab = pasos.filter((p) => p.tipo === "vocabulario");
    const vocabConImagen = vocab.filter((p) => !!p.imagenUrl).length;
    console.log(
      `#${l.id} "${l.titulo}" — ${pasos.length} pasos, ${conAudio} con audio, ${vocabConImagen}/${vocab.length} vocab con imagen`
    );
    const muestra = pasos.find((p) => !!p.audioUrl);
    if (muestra) console.log(`    audio ej.: ${muestra.audioUrl}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
