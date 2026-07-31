/**
 * Diagnóstico temporal: lecciones 100% completas (voz real en todos los pasos + imagen en todo el vocabulario).
 * Uso: railway run npx ts-node src/scripts/tmp-estado-completo.ts
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

const PLACEHOLDER = "https://pending.local/audio-placeholder.wav";

async function main(): Promise<void> {
  const todas = await prisma.leccion.findMany({
    where: { content: { not: Prisma.DbNull } },
    select: { id: true, titulo: true, content: true },
  });

  const completas = todas.filter((l) => {
    const pasos = pasosDe(l.content);
    if (pasos.length === 0) return false;
    const todosConAudioReal = pasos.every((p) => !!p.audioUrl && p.audioUrl !== PLACEHOLDER);
    const vocab = pasos.filter((p) => p.tipo === "vocabulario");
    const vocabConImagen = vocab.length > 0 && vocab.every((p) => !!p.imagenUrl);
    return todosConAudioReal && vocabConImagen;
  });

  const conAlgoDeAudioYImagenes = todas.filter((l) => {
    const pasos = pasosDe(l.content);
    if (pasos.length === 0) return false;
    const algoDeAudioReal = pasos.some((p) => !!p.audioUrl && p.audioUrl !== PLACEHOLDER);
    const vocab = pasos.filter((p) => p.tipo === "vocabulario");
    const vocabConImagen = vocab.length > 0 && vocab.every((p) => !!p.imagenUrl);
    return algoDeAudioReal && vocabConImagen;
  });

  console.log(
    `Lecciones 100% completas (voz real en TODOS los pasos + imagen en TODO el vocab): ${completas.length}`
  );
  console.log(completas.map((l) => `#${l.id} ${l.titulo}`).join("\n"));

  console.log(
    `\nLecciones con AL MENOS algo de voz real + TODO el vocab con imagen: ${conAlgoDeAudioYImagenes.length}`
  );
  console.log(conAlgoDeAudioYImagenes.map((l) => `#${l.id} ${l.titulo}`).join("\n"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
