/**
 * Genera 259 tareas de Task Master (una por lección nueva de
 * seed-curriculum-500.ts), en orden de nivel A1 → A2 → B1 → B2 → C1 (dentro
 * de cada nivel, en el orden de CURSOS: general, talleres, oficina, viajar,
 * restaurantes, tecnicos-pc, call-center).
 *
 * NO usa `task-master add-task` (259 llamadas a IA sería carísimo e
 * innecesario acá — el roster completo ya está definido en código, no hay
 * nada que "inventar"). Escribe directo en .taskmaster/tasks/tasks.json
 * respetando el schema exacto que usa Task Master, y corre
 * `task-master generate` al final para materializar los archivos por tarea.
 *
 * Uso: npx ts-node src/scripts/generar-tasks-500.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "../lib/prisma";
import { CURSOS, CapituloSeed } from "./seed-curriculum-500";

const NIVEL_ORDEN = ["A1", "A2", "B1", "B2", "C1"];

interface TareaLeccion {
  leccionId: number;
  cursoTitulo: string;
  cursoSlug: string;
  rutaSlug: string;
  nivel: string;
  capituloTitulo: string;
  leccionTitulo: string;
}

async function resolverLeccionIds(): Promise<TareaLeccion[]> {
  const tareas: TareaLeccion[] = [];

  for (const curso of CURSOS) {
    const cursoOnline = await prisma.cursoOnline.findUnique({ where: { slug: curso.cursoSlug } });
    if (!cursoOnline) {
      console.warn(`CursoOnline "${curso.cursoSlug}" no encontrado — ¿corriste seed-curriculum-500.ts primero?`);
      continue;
    }

    for (const cap of curso.capitulos as CapituloSeed[]) {
      const capitulo = await prisma.capitulo.findFirst({
        where: { cursoOnlineId: cursoOnline.id, titulo: cap.titulo },
      });
      if (!capitulo) {
        console.warn(`Capitulo "${cap.titulo}" no encontrado en ${curso.cursoTitulo}`);
        continue;
      }

      for (const leccionTitulo of cap.lecciones) {
        const leccion = await prisma.leccion.findFirst({
          where: { capituloId: capitulo.id, titulo: leccionTitulo },
        });
        if (!leccion) {
          console.warn(`Leccion "${leccionTitulo}" no encontrada en capítulo "${cap.titulo}"`);
          continue;
        }
        tareas.push({
          leccionId: leccion.id,
          cursoTitulo: curso.cursoTitulo,
          cursoSlug: curso.cursoSlug,
          rutaSlug: curso.rutaSlug,
          nivel: cap.nivel,
          capituloTitulo: cap.titulo,
          leccionTitulo,
        });
      }
    }
  }

  return tareas;
}

interface TaskMasterTask {
  id: string;
  title: string;
  description: string;
  details: string;
  testStrategy: string;
  priority: string;
  dependencies: string[];
  status: string;
  subtasks: unknown[];
  updatedAt: string;
}

function construirTask(t: TareaLeccion, id: number): TaskMasterTask {
  const ahora = new Date().toISOString();
  return {
    id: String(id),
    title: `Generar lección: ${t.leccionTitulo} (${t.cursoTitulo}, ${t.nivel})`,
    description: `Generar el contenido interactivo de la Leccion #${t.leccionId} — "${t.leccionTitulo}" (capítulo "${t.capituloTitulo}", curso "${t.cursoTitulo}", nivel ${t.nivel}).`,
    details: [
      `Comando: PIPER_VOICE_PATH=<path-al-voice-model> railway run npm run generate:leccion -- ${t.leccionId} "${t.leccionTitulo}"`,
      `Curso: ${t.cursoTitulo} (slug: ${t.cursoSlug}, ruta: ${t.rutaSlug})`,
      `Capítulo: ${t.capituloTitulo} | Nivel: ${t.nivel}`,
      `Usar la Lección #1 de A1 ("Saludos básicos y despedidas") como molde de estructura y calidad: 7 tipos de paso disponibles, imágenes fotorrealistas de personas 100% ficticias (Gemini Interactions API), audio Piper verificado por bytes, sin señuelos en "ordenar" (el .refine() de Zod ya lo impide, no lo toques).`,
      t.rutaSlug !== "general"
        ? `IMPORTANTE — no duplicar con "general": este curso es vocacional, el ángulo debe ser el del profesional/trabajador (o del turista en tránsito para "viajar"), nunca el genérico que ya cubre Inglés General. Ver reglas de no-duplicación en .taskmaster/docs/expansion-500-lecciones.md.`
        : `Este es un tema nuevo de Inglés General — verificar que no repite ninguno de los 228+ capítulos ya existentes en el curso.`,
    ].join("\n"),
    testStrategy: "Verificar en el resumen del script: 8-12 pasos generados, audios subidos (no saltados) para vocabulario/escuchar/ordenar, imágenes generadas o reusadas de la librería para todos los pasos de vocabulario, 0 errores de validación Zod. Revisar visualmente en /cursos/{ruta}/leccion/{slug} si es una de las primeras lecciones de su curso.",
    priority: "medium",
    dependencies: [],
    status: "pending",
    subtasks: [],
    updatedAt: ahora,
  };
}

async function main(): Promise<void> {
  const tareasLeccion = await resolverLeccionIds();
  console.log(`${tareasLeccion.length} lecciones resueltas desde el roster (esperado: 259).`);

  if (tareasLeccion.length === 0) {
    console.error("No se resolvió ninguna lección — abortando sin tocar tasks.json.");
    process.exitCode = 1;
    return;
  }

  const rankNivel = (nivel: string) => {
    const idx = NIVEL_ORDEN.indexOf(nivel);
    return idx === -1 ? NIVEL_ORDEN.length : idx;
  };
  const cursoOrdenIdx = new Map(CURSOS.map((c, i) => [c.cursoSlug, i]));

  const ordenadas = [...tareasLeccion].sort((a, b) => {
    const nivelDiff = rankNivel(a.nivel) - rankNivel(b.nivel);
    if (nivelDiff !== 0) return nivelDiff;
    return (cursoOrdenIdx.get(a.cursoSlug) ?? 99) - (cursoOrdenIdx.get(b.cursoSlug) ?? 99);
  });

  const tasksPath = join(__dirname, "..", "..", "..", ".taskmaster", "tasks", "tasks.json");
  const data = JSON.parse(readFileSync(tasksPath, "utf8"));
  const tareasExistentes = data.master.tasks as TaskMasterTask[];
  const maxIdExistente = Math.max(0, ...tareasExistentes.map((t) => Number(t.id)));

  const nuevasTareas = ordenadas.map((t, i) => construirTask(t, maxIdExistente + 1 + i));
  data.master.tasks = [...tareasExistentes, ...nuevasTareas];
  data.master.metadata.taskCount = data.master.tasks.length;
  data.master.metadata.lastModified = new Date().toISOString();

  writeFileSync(tasksPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`${nuevasTareas.length} tareas nuevas agregadas a tasks.json (IDs ${maxIdExistente + 1}-${maxIdExistente + nuevasTareas.length}).`);

  console.log("Corriendo `task-master generate`...");
  execSync("npx task-master generate", { cwd: join(__dirname, "..", "..", ".."), stdio: "inherit" });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
