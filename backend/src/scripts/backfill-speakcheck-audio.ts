/**
 * Backfill: genera audio Piper para pasos "speak-check" que se guardaron sin
 * audioUrl (bug real — textoPronunciable() no contemplaba ese tipo, así que
 * PasoSpeakCheckView.sayWord() caía al fallback speechSynthesis del
 * navegador con una voz de sistema no deseada). No toca contenido ni
 * imágenes — solo sintetiza con PIPER_VOICE_PATH y sube a la MISMA key que
 * usa generate-leccion.ts, así que no hace falta reescribir audioUrl para
 * los pasos vocabulario/escuchar/ordenar que ya lo tenían con la voz vieja
 * (mismo URL, bytes nuevos). Para speak-check (que nunca tuvo audioUrl) sí
 * escribe el campo nuevo en Leccion.content.
 *
 * Uso:
 *   npx ts-node src/scripts/backfill-speakcheck-audio.ts [--dry-run]
 */
import prisma from "../lib/prisma";
import { isPiperConfigurado, sintetizarAudioPiper, limpiarTextoParaVoz } from "../lib/piper-tts";
import { subirArchivoR2 } from "../lib/storage";
import { LeccionContenido, PasoLeccion } from "../lib/leccion-contenido.schema";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  if (!dryRun && !isPiperConfigurado()) {
    console.error("PIPER_VOICE_PATH no está configurado (o el archivo de voz no existe).");
    process.exit(1);
  }

  const lecciones = await prisma.leccion.findMany({
    where: { content: { not: undefined } },
    select: { id: true, titulo: true, content: true },
  });

  let leccionesTocadas = 0;
  let pasosActualizados = 0;
  let pasosFallidos = 0;

  for (const leccion of lecciones) {
    const contenido = leccion.content as unknown as LeccionContenido | null;
    if (!contenido || !Array.isArray(contenido.pasos)) continue;

    const pasosSpeakCheckSinAudio = contenido.pasos.filter(
      (p): p is PasoLeccion & { tipo: "speak-check" } => p.tipo === "speak-check" && !p.audioUrl
    );
    if (pasosSpeakCheckSinAudio.length === 0) continue;

    console.log(`Leccion #${leccion.id} ("${leccion.titulo}"): ${pasosSpeakCheckSinAudio.length} paso(s) speak-check sin audio.`);

    if (dryRun) {
      leccionesTocadas += 1;
      pasosActualizados += pasosSpeakCheckSinAudio.length;
      continue;
    }

    const pasosNuevos: PasoLeccion[] = [];
    let huboFalla = false;

    for (const paso of contenido.pasos) {
      if (paso.tipo !== "speak-check" || paso.audioUrl) {
        pasosNuevos.push(paso);
        continue;
      }

      try {
        const textoLimpio = limpiarTextoParaVoz(paso.target);
        const audioBuffer = await sintetizarAudioPiper(textoLimpio);
        const key = `lecciones/${leccion.id}/audio/${paso.id}.wav`;
        const url = await subirArchivoR2(key, audioBuffer, "audio/wav");

        if (!url) {
          console.warn(`  ✗ ${paso.id}: no se pudo subir a R2 — se deja sin audio.`);
          pasosFallidos += 1;
          pasosNuevos.push(paso);
          huboFalla = true;
          continue;
        }

        const remoto = await fetch(url, { method: "HEAD" }).catch(() => null);
        const bytesRemotos = remoto ? Number(remoto.headers.get("content-length")) : -1;
        if (bytesRemotos !== audioBuffer.length) {
          console.warn(`  ✗ ${paso.id}: cotejo de bytes falló (R2=${bytesRemotos}, generado=${audioBuffer.length}) — se deja sin audio.`);
          pasosFallidos += 1;
          pasosNuevos.push(paso);
          huboFalla = true;
          continue;
        }

        console.log(`  ♪ ${paso.id} dice ${JSON.stringify(textoLimpio)} (${audioBuffer.length} bytes, verificado en R2)`);
        pasosActualizados += 1;
        pasosNuevos.push({ ...paso, audioUrl: url });
      } catch (err) {
        console.warn(`  ✗ ${paso.id}: ${err instanceof Error ? err.message : err}`);
        pasosFallidos += 1;
        pasosNuevos.push(paso);
        huboFalla = true;
      }
    }

    await prisma.leccion.update({
      where: { id: leccion.id },
      data: { content: { ...contenido, pasos: pasosNuevos } },
    });
    leccionesTocadas += 1;
    if (huboFalla) console.warn(`  (Leccion #${leccion.id} guardada con al menos un paso speak-check sin audio.)`);
  }

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Lecciones con speak-check afectadas: ${leccionesTocadas}`);
  console.log(`Pasos actualizados: ${pasosActualizados}`);
  console.log(`Pasos fallidos: ${pasosFallidos}`);
  if (dryRun) console.log("--dry-run: no se sintetizó audio ni se guardó nada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
