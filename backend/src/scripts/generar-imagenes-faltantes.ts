/**
 * Recorre TODAS las lecciones que ya tienen contenido guardado y genera
 * imagen solo para los pasos de vocabulario que aún no la tienen — no toca
 * Claude, no regenera texto ni audio, no re-sube lo que ya está en la
 * librería de R2 (usa el mismo cache por concepto que generate-leccion.ts).
 *
 * Uso:
 *   npx ts-node src/scripts/generar-imagenes-faltantes.ts [--dry-run]
 *
 * --dry-run: solo cuenta cuántos pasos les falta imagen, no llama a Gemini
 * ni guarda nada.
 */
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { leccionContenidoSchema, PasoLeccion } from "../lib/leccion-contenido.schema";
import { isGeminiConfigurado } from "../lib/gemini-image";
import { resolverImagenVocabulario } from "../lib/imagen-vocabulario";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!dryRun && !isGeminiConfigurado()) {
    console.error("GEMINI_API_KEY no configurada — no hay nada que generar (corré con --dry-run para solo contar).");
    process.exit(1);
  }

  const lecciones = await prisma.leccion.findMany({ where: { content: { not: Prisma.DbNull } } });
  console.log(`${lecciones.length} lecciones con contenido guardado.`);

  let leccionesActualizadas = 0;
  let generadas = 0;
  let reusadas = 0;
  let saltadas = 0;
  let leccionesInvalidas = 0;

  for (const leccion of lecciones) {
    const parsed = leccionContenidoSchema.safeParse(leccion.content);
    if (!parsed.success) {
      leccionesInvalidas += 1;
      console.warn(`Leccion #${leccion.id}: content no cumple leccionContenidoSchema, se omite.`);
      continue;
    }

    let huboCambios = false;
    const pasosActualizados: PasoLeccion[] = [];

    for (const paso of parsed.data.pasos) {
      if (paso.tipo !== "vocabulario" || !paso.imagenBusqueda || paso.imagenUrl) {
        pasosActualizados.push(paso);
        continue;
      }

      if (dryRun) {
        saltadas += 1;
        pasosActualizados.push(paso);
        continue;
      }

      try {
        const resuelta = await resolverImagenVocabulario(paso.imagenBusqueda);
        if (!resuelta) {
          saltadas += 1;
          pasosActualizados.push(paso);
          continue;
        }
        const etiqueta = resuelta.fuente === "cache" ? "reusada" : "generada";
        console.log(`  🖼  Leccion #${leccion.id} · ${paso.id} ("${paso.imagenBusqueda}") → ${etiqueta}: ${resuelta.url}`);
        if (resuelta.fuente === "cache") reusadas += 1;
        else generadas += 1;
        pasosActualizados.push({ ...paso, imagenUrl: resuelta.url });
        huboCambios = true;
      } catch (err) {
        saltadas += 1;
        pasosActualizados.push(paso);
        console.warn(`Error generando imagen para Leccion #${leccion.id} · ${paso.id}:`, err instanceof Error ? err.message : err);
      }
    }

    if (huboCambios) {
      await prisma.leccion.update({
        where: { id: leccion.id },
        data: { content: { ...parsed.data, pasos: pasosActualizados } },
      });
      leccionesActualizadas += 1;
    }
  }

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Lecciones con content inválido (omitidas): ${leccionesInvalidas}`);
  console.log(`Lecciones actualizadas: ${leccionesActualizadas}`);
  console.log(`Imágenes generadas:     ${generadas}`);
  console.log(`Imágenes reusadas:      ${reusadas}`);
  console.log(`Imágenes saltadas:      ${saltadas}`);
  if (dryRun) console.log("--dry-run: no se llamó a Gemini ni se guardó nada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
