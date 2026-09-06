/**
 * Recorre lecciones que ya tienen contenido guardado y sintetiza el audio
 * Piper que les falta a sus pasos pronunciables (vocabulario, escuchar,
 * ordenar, speak-check) — no toca Claude, no regenera texto ni imágenes.
 *
 * Nace de un bug real: ~40 lecciones se publicaron antes de que
 * generate-leccion.ts abortara sin Piper, así que quedaron con pasos
 * "vocabulario"/"ordenar" sin audioUrl (no aparece el botón 🔊 con la palabra
 * en inglés) y pasos "escuchar" con el placeholder inexistente
 * "https://pending.local/audio-placeholder.wav" (ejercicio roto).
 *
 * Sube a la MISMA key que usa generate-leccion.ts
 * (lecciones/<id>/audio/<pasoId>.wav) y verifica byte a byte contra R2 antes
 * de escribir el audioUrl en Leccion.content.
 *
 * Uso (el audio y R2 viven en Railway, de ahí el `railway run`):
 *   PIPER_VOICE_PATH=$PWD/voices/en_US-lessac-medium.onnx \
 *     railway run npx ts-node src/scripts/generar-audio-faltante.ts [--dry-run] [--forzar] [--leccion <id>]
 *
 * --dry-run: solo cuenta qué pasos procesaría, no sintetiza ni guarda nada.
 * --forzar: re-sintetiza también los pasos que ya tienen un audioUrl real
 *   (para cuando cambia la voz). Por defecto solo rellena los que faltan o
 *   quedaron con el placeholder.
 * --leccion <id>: limita a una sola Leccion (por defecto recorre todas).
 */
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { leccionContenidoSchema, PasoLeccion } from "../lib/leccion-contenido.schema";
import { isPiperConfigurado, sintetizarAudioPiper, limpiarTextoParaVoz } from "../lib/piper-tts";
import { subirArchivoR2 } from "../lib/storage";

// Mismo placeholder que generate-leccion.ts escribe en los pasos "escuchar"
// antes de reemplazarlo con el audio real.
const PLACEHOLDER_AUDIO_URL = "https://pending.local/audio-placeholder.wav";

// Espejo de textoPronunciable() de generate-leccion.ts: qué texto se le pasa a
// Piper según el tipo de paso. Devuelve undefined para los tipos sin audio.
function textoPronunciable(paso: PasoLeccion): string | undefined {
  if (paso.tipo === "vocabulario") return paso.palabra;
  if (paso.tipo === "escuchar") return paso.opciones[paso.respuestaCorrecta];
  if (paso.tipo === "ordenar") return paso.fraseCorrecta;
  if (paso.tipo === "speak-check") return paso.target;
  return undefined;
}

// true si el paso necesita audio: no tiene audioUrl, o tiene el placeholder,
// o se pidió --forzar sobre un paso pronunciable.
function necesitaAudio(paso: PasoLeccion, forzar: boolean): boolean {
  if (textoPronunciable(paso) === undefined) return false;
  const url = "audioUrl" in paso ? paso.audioUrl : undefined;
  if (!url || url === PLACEHOLDER_AUDIO_URL) return true;
  return forzar;
}

function parseLeccionId(argv: string[]): number | undefined {
  const idx = argv.indexOf("--leccion");
  if (idx === -1) return undefined;
  const valor = Number(argv[idx + 1]);
  if (!Number.isInteger(valor) || valor <= 0) {
    console.error("--leccion requiere un id numérico válido.");
    process.exit(1);
  }
  return valor;
}

interface SintesisResultado {
  paso: PasoLeccion;
  ok: boolean;
}

async function sintetizarPaso(
  leccionId: number,
  paso: PasoLeccion
): Promise<SintesisResultado> {
  const texto = textoPronunciable(paso);
  if (texto === undefined) return { paso, ok: true };

  try {
    const textoLimpio = limpiarTextoParaVoz(texto);
    const audioBuffer = await sintetizarAudioPiper(textoLimpio);
    const key = `lecciones/${leccionId}/audio/${paso.id}.wav`;
    const url = await subirArchivoR2(key, audioBuffer, "audio/wav");

    if (!url) {
      console.warn(`  ✗ Leccion #${leccionId} · ${paso.id}: no se pudo subir a R2 — se deja como estaba.`);
      return { paso, ok: false };
    }

    // Cotejo texto↔audio byte a byte contra R2, igual que generate-leccion.ts.
    const remoto = await fetch(url, { method: "HEAD" }).catch(() => null);
    const bytesRemotos = remoto ? Number(remoto.headers.get("content-length")) : -1;
    if (bytesRemotos !== audioBuffer.length) {
      console.warn(
        `  ✗ Leccion #${leccionId} · ${paso.id}: cotejo de bytes falló ` +
          `(R2=${bytesRemotos}, generado=${audioBuffer.length}) — se deja como estaba.`
      );
      return { paso, ok: false };
    }

    console.log(
      `  ♪ Leccion #${leccionId} · ${paso.id} (${paso.tipo}) dice ${JSON.stringify(textoLimpio)} ` +
        `(${audioBuffer.length} bytes, verificado en R2)`
    );
    return { paso: { ...paso, audioUrl: url }, ok: true };
  } catch (err) {
    console.warn(
      `  ✗ Leccion #${leccionId} · ${paso.id}: ${err instanceof Error ? err.message : err}`
    );
    return { paso, ok: false };
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const forzar = process.argv.includes("--forzar");
  const leccionId = parseLeccionId(process.argv);

  if (!dryRun && !isPiperConfigurado()) {
    console.error(
      "PIPER_VOICE_PATH no está configurado (o el archivo de voz no existe).\n" +
        "Descargá la voz y reintentá:\n" +
        "  python3 -m piper.download_voices en_US-lessac-medium --data-dir voices\n" +
        "  PIPER_VOICE_PATH=$PWD/voices/en_US-lessac-medium.onnx railway run \\\n" +
        "    npx ts-node src/scripts/generar-audio-faltante.ts\n" +
        "(corré con --dry-run para solo contar sin sintetizar nada)."
    );
    process.exit(1);
  }

  const lecciones = await prisma.leccion.findMany({
    where: { content: { not: Prisma.DbNull }, ...(leccionId ? { id: leccionId } : {}) },
  });
  console.log(
    `${lecciones.length} lecciones con contenido guardado${leccionId ? ` (filtrado a #${leccionId})` : ""}.`
  );

  let leccionesActualizadas = 0;
  let leccionesInvalidas = 0;
  let pasosActualizados = 0;
  let pasosFallidos = 0;
  let pasosPendientes = 0;

  for (const leccion of lecciones) {
    const parsed = leccionContenidoSchema.safeParse(leccion.content);
    if (!parsed.success) {
      leccionesInvalidas += 1;
      console.warn(`Leccion #${leccion.id}: content no cumple leccionContenidoSchema, se omite.`);
      continue;
    }

    const aProcesar = parsed.data.pasos.filter((p) => necesitaAudio(p, forzar));
    if (aProcesar.length === 0) continue;

    console.log(
      `Leccion #${leccion.id} ("${leccion.titulo}"): ${aProcesar.length} paso(s) sin audio ` +
        `(${aProcesar.map((p) => `${p.id}:${p.tipo}`).join(", ")}).`
    );

    if (dryRun) {
      pasosPendientes += aProcesar.length;
      continue;
    }

    const pasosNuevos: PasoLeccion[] = [];
    let huboCambios = false;
    let huboFalla = false;

    for (const paso of parsed.data.pasos) {
      if (!necesitaAudio(paso, forzar)) {
        pasosNuevos.push(paso);
        continue;
      }
      const { paso: pasoNuevo, ok } = await sintetizarPaso(leccion.id, paso);
      pasosNuevos.push(pasoNuevo);
      if (ok && pasoNuevo !== paso) {
        pasosActualizados += 1;
        huboCambios = true;
      } else if (!ok) {
        pasosFallidos += 1;
        huboFalla = true;
      }
    }

    if (huboCambios) {
      await prisma.leccion.update({
        where: { id: leccion.id },
        data: { content: { ...parsed.data, pasos: pasosNuevos } },
      });
      leccionesActualizadas += 1;
    }
    if (huboFalla) {
      console.warn(`  (Leccion #${leccion.id} guardada con al menos un paso sin audio — revisá Piper/R2 y reintentá.)`);
    }
  }

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Lecciones con content inválido (omitidas): ${leccionesInvalidas}`);
  console.log(`Lecciones actualizadas: ${leccionesActualizadas}`);
  console.log(`Pasos con audio nuevo:  ${pasosActualizados}`);
  console.log(`Pasos fallidos:         ${pasosFallidos}`);
  if (dryRun) console.log(`Pasos que se procesarían: ${pasosPendientes}`);
  if (dryRun) console.log("--dry-run: no se sintetizó audio ni se guardó nada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
