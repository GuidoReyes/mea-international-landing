/**
 * Backfill: agrega el campo "fraseCorrecta" a los pasos "ordenar" que se
 * guardaron sin él (lecciones generadas antes de que
 * leccion-contenido.schema.ts lo hiciera obligatorio como ancla de
 * autoconsistencia). Sin ese campo, leccionContenidoSchema.safeParse() falla
 * y la lección entera queda fuera de todo backfill posterior (audio,
 * imágenes) y el endpoint admin de guardado la rechaza.
 *
 * "fraseCorrecta" está DEFINIDA como la frase que se arma aplicando
 * ordenCorrecto sobre palabras: palabras[ordenCorrecto[0]] + " " + ... — así
 * que reconstruirla es exactamente el valor que el .refine() del schema
 * espera. No inventa nada.
 *
 * Uso:
 *   DATABASE_URL="mysql://..." npx ts-node src/scripts/backfill-frase-correcta.ts [--dry-run]
 */
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { leccionContenidoSchema } from "../lib/leccion-contenido.schema";

interface PasoOrdenarCrudo {
  tipo: "ordenar";
  id: string;
  palabras: string[];
  ordenCorrecto: number[];
  fraseCorrecta?: string;
  [k: string]: unknown;
}

function esOrdenarSinFrase(paso: unknown): paso is PasoOrdenarCrudo {
  if (typeof paso !== "object" || paso === null) return false;
  const p = paso as Record<string, unknown>;
  return (
    p.tipo === "ordenar" &&
    Array.isArray(p.palabras) &&
    Array.isArray(p.ordenCorrecto) &&
    typeof p.fraseCorrecta !== "string"
  );
}

function reconstruirFrase(paso: PasoOrdenarCrudo): string | undefined {
  if (paso.ordenCorrecto.length !== paso.palabras.length) return undefined;
  const indices = [...paso.ordenCorrecto].sort((a, b) => a - b);
  if (!indices.every((idx, i) => idx === i)) return undefined;
  return paso.ordenCorrecto.map((i) => paso.palabras[i]).join(" ");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const lecciones = await prisma.leccion.findMany({
    where: { content: { not: Prisma.DbNull } },
    select: { id: true, titulo: true, content: true },
  });

  let leccionesTocadas = 0;
  let pasosArreglados = 0;
  let leccionesAunInvalidas = 0;
  let pasosNoReconstruibles = 0;

  for (const leccion of lecciones) {
    const contenido = leccion.content as { pasos?: unknown[] } | null;
    if (!contenido || !Array.isArray(contenido.pasos)) continue;
    if (!contenido.pasos.some(esOrdenarSinFrase)) continue;

    const pasosNuevos = contenido.pasos.map((paso) => {
      if (!esOrdenarSinFrase(paso)) return paso;
      const frase = reconstruirFrase(paso);
      if (!frase) {
        pasosNoReconstruibles += 1;
        console.warn(
          `  ✗ Leccion #${leccion.id} · ${paso.id}: ordenCorrecto/palabras no reconstruyen una frase (orden=${JSON.stringify(
            paso.ordenCorrecto
          )}, palabras=${JSON.stringify(paso.palabras)}) — se deja como está.`
        );
        return paso;
      }
      pasosArreglados += 1;
      console.log(`  ✎ Leccion #${leccion.id} · ${paso.id}: fraseCorrecta = ${JSON.stringify(frase)}`);
      return { ...paso, fraseCorrecta: frase };
    });

    const parsed = leccionContenidoSchema.safeParse({ ...contenido, pasos: pasosNuevos });
    if (!parsed.success) {
      // No se guarda nada si el arreglo no deja la lección válida — el
      // problema es otro y hay que mirarlo a mano.
      leccionesAunInvalidas += 1;
      console.warn(
        `  ⚠ Leccion #${leccion.id} ("${leccion.titulo}") sigue sin cumplir el schema tras el backfill — NO se guarda:`
      );
      for (const issue of parsed.error.issues) {
        console.warn(`      ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }

    if (dryRun) {
      leccionesTocadas += 1;
      continue;
    }

    await prisma.leccion.update({
      where: { id: leccion.id },
      data: { content: parsed.data },
    });
    leccionesTocadas += 1;
  }

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Lecciones tocadas:            ${leccionesTocadas}`);
  console.log(`Pasos 'ordenar' con frase:    ${pasosArreglados}`);
  console.log(`Pasos no reconstruibles:      ${pasosNoReconstruibles}`);
  console.log(`Lecciones aún inválidas:      ${leccionesAunInvalidas}`);
  if (dryRun) console.log("--dry-run: no se guardó nada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
