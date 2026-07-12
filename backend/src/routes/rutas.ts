import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getJSON, setJSON, COURSE_CACHE_TTL } from "../lib/redis";
import { optionalAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { tieneSuscripcionActiva } from "../lib/suscripciones";

const router = Router();
const CACHE_KEY_ALL = "rutas:all";
const cacheKeySlug = (slug: string) => `rutas:slug:${slug}`;

const ORDEN_NIVEL = ["A1", "A2", "B1", "B2", "C1"];
const rangoNivel = (nivel: string) => {
  const i = ORDEN_NIVEL.indexOf(nivel);
  return i === -1 ? ORDEN_NIVEL.length : i;
};

interface RutaResumen {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivelMinimo: string;
  nivelMaximo: string;
  icono: string | null;
  proximamente: boolean;
  totalLecciones: number;
}

// GET /api/rutas — catálogo público de rutas publicadas
router.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = await getJSON<RutaResumen[]>(CACHE_KEY_ALL);
    if (cached) { res.json(cached); return; }
  } catch { /* Redis unavailable, fall through to DB */ }

  const rutas = await prisma.ruta.findMany({
    where: { publicada: true },
    orderBy: { orden: "asc" },
    include: { lecciones: { select: { leccionId: true } } },
  });

  const resumen: RutaResumen[] = rutas.map((ruta) => ({
    id: ruta.id,
    slug: ruta.slug,
    titulo: ruta.titulo,
    descripcion: ruta.descripcion,
    nivelMinimo: ruta.nivelMinimo,
    nivelMaximo: ruta.nivelMaximo,
    icono: ruta.icono,
    proximamente: ruta.proximamente,
    totalLecciones: ruta.lecciones.length,
  }));

  try { await setJSON(CACHE_KEY_ALL, resumen, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(resumen);
});

interface LeccionCurriculum {
  id: number;
  titulo: string;
  slug: string;
  esGratis: boolean;
  bloqueada: boolean;
  urlContenido: string | null;
  completada?: boolean;
  puntaje?: number | null;
}

interface CapituloCurriculum {
  id: number;
  titulo: string;
  nivel: string;
  lecciones: LeccionCurriculum[];
}

interface RutaCurriculum {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivelMinimo: string;
  nivelMaximo: string;
  proximamente: boolean;
  capitulos: CapituloCurriculum[];
  // Solo presentes con sesión de alumno
  suscripcionActiva?: boolean;
  porcentaje?: number;
}

// GET /api/rutas/:slug/curriculum — lecciones curadas agrupadas por capítulo.
// Curación vía RutaLeccion: no duplica filas, solo referencia Lecciones que
// viven bajo su CursoOnline real (general o especializado).
router.get("/:slug/curriculum", optionalAlumnoJWT, async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  const alumnoId = req.alumno?.alumnoId;

  if (!alumnoId) {
    try {
      const cached = await getJSON<RutaCurriculum>(cacheKeySlug(slug));
      if (cached) { res.json(cached); return; }
    } catch { /* Redis unavailable, fall through to DB */ }
  }

  const ruta = await prisma.ruta.findFirst({
    where: { slug, publicada: true },
    include: {
      lecciones: {
        orderBy: { orden: "asc" },
        include: {
          leccion: {
            include: { capitulo: true },
          },
        },
      },
    },
  });

  if (!ruta) {
    res.status(404).json({ error: "Ruta no encontrada" });
    return;
  }

  const suscripcionActiva = alumnoId ? await tieneSuscripcionActiva(alumnoId) : false;

  const leccionIds = ruta.lecciones.map((rl) => rl.leccion.id);
  const progresoPorLeccion = new Map<number, { completada: boolean; puntaje: number | null }>();
  if (alumnoId && leccionIds.length > 0) {
    const progresos = await prisma.progresoLeccion.findMany({
      where: { alumnoId, leccionId: { in: leccionIds } },
      select: { leccionId: true, completada: true, puntaje: true },
    });
    for (const p of progresos) {
      progresoPorLeccion.set(p.leccionId, { completada: p.completada, puntaje: p.puntaje });
    }
  }

  // Agrupar por capítulo preservando el orden de RutaLeccion, ordenado por nivel
  const capitulosMap = new Map<number, CapituloCurriculum>();
  for (const rl of ruta.lecciones) {
    const cap = rl.leccion.capitulo;
    if (!capitulosMap.has(cap.id)) {
      capitulosMap.set(cap.id, { id: cap.id, titulo: cap.titulo, nivel: cap.nivel, lecciones: [] });
    }
    const desbloqueada = rl.leccion.esGratis || suscripcionActiva;
    const progreso = progresoPorLeccion.get(rl.leccion.id);
    capitulosMap.get(cap.id)!.lecciones.push({
      id: rl.leccion.id,
      titulo: rl.leccion.titulo,
      slug: rl.leccion.slug,
      esGratis: rl.leccion.esGratis,
      bloqueada: !desbloqueada,
      urlContenido: desbloqueada ? rl.leccion.urlContenido : null,
      ...(alumnoId
        ? { completada: progreso?.completada ?? false, puntaje: progreso?.puntaje ?? null }
        : {}),
    });
  }

  const capitulos = Array.from(capitulosMap.values()).sort(
    (a, b) => rangoNivel(a.nivel) - rangoNivel(b.nivel)
  );

  const curriculum: RutaCurriculum = {
    id: ruta.id,
    slug: ruta.slug,
    titulo: ruta.titulo,
    descripcion: ruta.descripcion,
    nivelMinimo: ruta.nivelMinimo,
    nivelMaximo: ruta.nivelMaximo,
    proximamente: ruta.proximamente,
    capitulos,
  };

  if (alumnoId) {
    const completadas = leccionIds.filter((id) => progresoPorLeccion.get(id)?.completada).length;
    curriculum.suscripcionActiva = suscripcionActiva;
    curriculum.porcentaje = leccionIds.length
      ? Math.round((completadas / leccionIds.length) * 100)
      : 0;
    res.json(curriculum);
    return;
  }

  try { await setJSON(cacheKeySlug(slug), curriculum, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(curriculum);
});

export default router;
