/**
 * One-off: corrige los pasos "ordenar" con ordenCorrecto/palabras rotos en las
 * lecciones #12, #13 y #14 (curso "Inglés para Talleres Mecánicos", capítulo
 * "Atención al cliente en el taller"). Son lecciones viejas anteriores al
 * campo fraseCorrecta y a los .refine() del schema: su "respuesta correcta"
 * arma frases sin sentido (ej. "When the did problem started ?"), y sin
 * fraseCorrecta la lección entera no pasa leccionContenidoSchema, así que
 * quedaba fuera de los backfills de audio/imágenes.
 *
 * No se regeneran con generate-leccion.ts porque el crédito prepago de Gemini
 * (imágenes de vocabulario) está agotado. Este parche arregla solo los 6
 * pasos rotos, con palabras/orden/frase revisados a mano, y deja el resto de
 * cada lección intacto. Valida contra el schema antes de guardar.
 *
 * Uso:
 *   DATABASE_URL="mysql://..." npx ts-node src/scripts/fix-ordenar-roto.ts [--dry-run]
 */
import prisma from "../lib/prisma";
import { leccionContenidoSchema } from "../lib/leccion-contenido.schema";

interface ParchePaso {
  leccionId: number;
  pasoId: string;
  palabras: string[];
  ordenCorrecto: number[];
  fraseCorrecta: string;
}

// palabras[ordenCorrecto[0]] + " " + ... debe ser EXACTAMENTE fraseCorrecta
// (lo verifica el .refine() del schema y este script antes de guardar).
const PARCHES: ParchePaso[] = [
  { leccionId: 12, pasoId: "paso-6", palabras: ["the", "start", "When", "problem", "did", "?"], ordenCorrecto: [2, 4, 0, 3, 1, 5], fraseCorrecta: "When did the problem start ?" },
  { leccionId: 12, pasoId: "paso-11", palabras: ["dashboard", "light", "on", "There's", "a", "my", "warning"], ordenCorrecto: [3, 4, 6, 1, 2, 5, 0], fraseCorrecta: "There's a warning light on my dashboard" },
  { leccionId: 13, pasoId: "paso-6", palabras: ["replace", "need", "to", "We", "the", "brake", "pads"], ordenCorrecto: [3, 1, 2, 0, 4, 5, 6], fraseCorrecta: "We need to replace the brake pads" },
  { leccionId: 13, pasoId: "paso-10", palabras: ["approved", "before", "we", "Your", "must", "be", "budget", "begin"], ordenCorrecto: [3, 6, 4, 5, 0, 1, 2, 7], fraseCorrecta: "Your budget must be approved before we begin" },
  { leccionId: 14, pasoId: "paso-7", palabras: ["us", "Please", "any", "let", "concerns", "know", "if", "you", "have"], ordenCorrecto: [1, 3, 0, 5, 6, 7, 8, 2, 4], fraseCorrecta: "Please let us know if you have any concerns" },
  { leccionId: 14, pasoId: "paso-11", palabras: ["the", "Hand", "and", "customer", "the", "invoice", "over", "keys", "the", "to"], ordenCorrecto: [1, 0, 7, 2, 4, 5, 6, 9, 8, 3], fraseCorrecta: "Hand the keys and the invoice over to the customer" },
];

function verificarParche(p: ParchePaso): void {
  const recon = p.ordenCorrecto.map((i) => p.palabras[i]).join(" ");
  const indicesOk =
    p.ordenCorrecto.length === p.palabras.length &&
    [...p.ordenCorrecto].sort((a, b) => a - b).every((idx, i) => idx === i);
  if (!indicesOk || recon !== p.fraseCorrecta) {
    throw new Error(
      `Parche inconsistente en Leccion #${p.leccionId} ${p.pasoId}: reconstruye ${JSON.stringify(recon)} ` +
        `pero fraseCorrecta es ${JSON.stringify(p.fraseCorrecta)}`
    );
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  PARCHES.forEach(verificarParche);

  const porLeccion = new Map<number, ParchePaso[]>();
  for (const p of PARCHES) {
    porLeccion.set(p.leccionId, [...(porLeccion.get(p.leccionId) ?? []), p]);
  }

  let guardadas = 0;
  for (const [leccionId, parches] of porLeccion) {
    const leccion = await prisma.leccion.findUnique({ where: { id: leccionId } });
    if (!leccion || !leccion.content) {
      console.error(`Leccion #${leccionId} no existe o no tiene content — se omite.`);
      continue;
    }

    const contenido = leccion.content as { pasos: Array<Record<string, unknown>> };
    const idsPatchados = new Set(parches.map((x) => x.pasoId));
    const encontrados = contenido.pasos.filter((p) => idsPatchados.has(p.id as string)).length;
    if (encontrados !== parches.length) {
      console.error(
        `Leccion #${leccionId}: se esperaban ${parches.length} pasos a parchar pero se encontraron ${encontrados} — se omite.`
      );
      continue;
    }

    const pasosNuevos = contenido.pasos.map((paso) => {
      const parche = parches.find((x) => x.pasoId === paso.id);
      if (!parche) return paso;
      console.log(`  ✎ Leccion #${leccionId} · ${parche.pasoId}: ${JSON.stringify(parche.fraseCorrecta)}`);
      return {
        ...paso,
        palabras: parche.palabras,
        ordenCorrecto: parche.ordenCorrecto,
        fraseCorrecta: parche.fraseCorrecta,
      };
    });

    const parsed = leccionContenidoSchema.safeParse({ ...contenido, pasos: pasosNuevos });
    if (!parsed.success) {
      console.error(`  ✗ Leccion #${leccionId} sigue sin cumplir el schema tras el parche — NO se guarda:`);
      for (const i of parsed.error.issues) console.error(`      ${i.path.join(".")}: ${i.message}`);
      continue;
    }

    if (dryRun) {
      console.log(`  ✓ Leccion #${leccionId}: válida (dry-run, no se guarda).`);
      continue;
    }

    await prisma.leccion.update({ where: { id: leccionId }, data: { content: parsed.data } });
    console.log(`  ✓ Leccion #${leccionId}: guardada.`);
    guardadas += 1;
  }

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Lecciones guardadas: ${guardadas}${dryRun ? " (dry-run)" : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
