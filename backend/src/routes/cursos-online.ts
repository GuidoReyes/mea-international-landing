import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getJSON, setJSON, COURSE_CACHE_TTL } from "../lib/redis";
import { verifyAlumnoJWT, optionalAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { tieneSuscripcionActiva } from "../lib/suscripciones";

const router = Router();
const CACHE_KEY_ALL = "cursos-online:all";
const cacheKeySlug = (slug: string) => `cursos-online:slug:${slug}`;

interface CursoOnlineResumen {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: string;
  track: string;
  proximamente: boolean;
  totalCapitulos: number;
  totalLecciones: number;
  leccionesGratis: number;
}

// GET /api/cursos-online — catálogo público de cursos publicados
router.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = await getJSON<CursoOnlineResumen[]>(CACHE_KEY_ALL);
    if (cached) { res.json(cached); return; }
  } catch { /* Redis unavailable, fall through to DB */ }

  const cursos = await prisma.cursoOnline.findMany({
    where: { publicado: true },
    orderBy: { orden: "asc" },
    include: {
      capitulos: {
        select: {
          lecciones: { select: { esGratis: true } },
        },
      },
    },
  });

  const resumen: CursoOnlineResumen[] = cursos.map((curso) => {
    const lecciones = curso.capitulos.flatMap((cap) => cap.lecciones);
    return {
      id: curso.id,
      slug: curso.slug,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      nivel: curso.nivel,
      track: curso.track,
      proximamente: curso.proximamente,
      totalCapitulos: curso.capitulos.length,
      totalLecciones: lecciones.length,
      leccionesGratis: lecciones.filter((l) => l.esGratis).length,
    };
  });

  try { await setJSON(CACHE_KEY_ALL, resumen, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(resumen);
});

interface LeccionPublica {
  id: number;
  titulo: string;
  slug: string;
  orden: number;
  esGratis: boolean;
  bloqueada: boolean;
  urlContenido: string | null;
  completada?: boolean;
  puntaje?: number | null;
}

interface CursoOnlineDetalle {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: string;
  track: string;
  proximamente: boolean;
  capitulos: { id: number; titulo: string; orden: number; lecciones: LeccionPublica[] }[];
  // Solo presentes con sesión de alumno
  inscrito?: boolean;
  suscripcionActiva?: boolean;
  porcentaje?: number;
}

// GET /api/cursos-online/mis/progreso — cursos inscritos del alumno con % de avance
router.get("/mis/progreso", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const alumnoId = req.alumno!.alumnoId;

  const inscripciones = await prisma.inscripcionOnline.findMany({
    where: { alumnoId },
    include: {
      cursoOnline: {
        include: { capitulos: { select: { lecciones: { select: { id: true } } } } },
      },
    },
    orderBy: { iniciadaEn: "desc" },
  });

  const certificados = await prisma.certificadoOnline.findMany({
    where: { alumnoId },
    select: { cursoOnlineId: true, codigo: true, urlPdf: true },
  });
  const certPorCurso = new Map(certificados.map((c) => [c.cursoOnlineId, c]));

  const resultado = await Promise.all(
    inscripciones.map(async (inscripcion) => {
      const leccionIds = inscripcion.cursoOnline.capitulos.flatMap((cap) =>
        cap.lecciones.map((l) => l.id)
      );
      const completadas = leccionIds.length
        ? await prisma.progresoLeccion.count({
            where: { alumnoId, completada: true, leccionId: { in: leccionIds } },
          })
        : 0;
      const cert = certPorCurso.get(inscripcion.cursoOnlineId);
      return {
        cursoOnlineId: inscripcion.cursoOnlineId,
        slug: inscripcion.cursoOnline.slug,
        titulo: inscripcion.cursoOnline.titulo,
        nivel: inscripcion.cursoOnline.nivel,
        track: inscripcion.cursoOnline.track,
        iniciadaEn: inscripcion.iniciadaEn,
        totalLecciones: leccionIds.length,
        leccionesCompletadas: completadas,
        porcentaje: leccionIds.length ? Math.round((completadas / leccionIds.length) * 100) : 0,
        certificado: cert ? { codigo: cert.codigo, urlPdf: cert.urlPdf } : null,
      };
    })
  );

  res.json(resultado);
});

// POST /api/cursos-online/:slug/inscribir — inscripción gratuita (idempotente)
router.post("/:slug/inscribir", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;

  const curso = await prisma.cursoOnline.findFirst({
    where: { slug, publicado: true },
    select: { id: true },
  });
  if (!curso) {
    res.status(404).json({ error: "Curso no encontrado" });
    return;
  }

  const alumnoId = req.alumno!.alumnoId;
  const existente = await prisma.inscripcionOnline.findUnique({
    where: { alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId: curso.id } },
  });
  if (existente) {
    res.json(existente);
    return;
  }

  const inscripcion = await prisma.inscripcionOnline.create({
    data: { alumnoId, cursoOnlineId: curso.id },
  });
  res.status(201).json(inscripcion);
});

// GET /api/cursos-online/:slug — detalle con capítulos y lecciones.
// Anónimo: solo lecciones esGratis exponen urlContenido (variante cacheada).
// Con sesión: progreso por lección y desbloqueo total si hay suscripción activa.
router.get("/:slug", optionalAlumnoJWT, async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  const alumnoId = req.alumno?.alumnoId;

  if (!alumnoId) {
    try {
      const cached = await getJSON<CursoOnlineDetalle>(cacheKeySlug(slug));
      if (cached) { res.json(cached); return; }
    } catch { /* Redis unavailable, fall through to DB */ }
  }

  const curso = await prisma.cursoOnline.findFirst({
    where: { slug, publicado: true },
    include: {
      capitulos: {
        orderBy: { orden: "asc" },
        include: { lecciones: { orderBy: { orden: "asc" } } },
      },
    },
  });

  if (!curso) {
    res.status(404).json({ error: "Curso no encontrado" });
    return;
  }

  const suscripcionActiva = alumnoId ? await tieneSuscripcionActiva(alumnoId) : false;

  const leccionIds = curso.capitulos.flatMap((cap) => cap.lecciones.map((l) => l.id));
  const progresoPorLeccion = new Map<number, { completada: boolean; puntaje: number | null }>();
  let inscrito = false;

  if (alumnoId) {
    const [progresos, inscripcion] = await Promise.all([
      prisma.progresoLeccion.findMany({
        where: { alumnoId, leccionId: { in: leccionIds } },
        select: { leccionId: true, completada: true, puntaje: true },
      }),
      prisma.inscripcionOnline.findUnique({
        where: { alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId: curso.id } },
        select: { id: true },
      }),
    ]);
    for (const p of progresos) {
      progresoPorLeccion.set(p.leccionId, { completada: p.completada, puntaje: p.puntaje });
    }
    inscrito = inscripcion !== null;
  }

  const detalle: CursoOnlineDetalle = {
    id: curso.id,
    slug: curso.slug,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    nivel: curso.nivel,
    track: curso.track,
    proximamente: curso.proximamente,
    capitulos: curso.capitulos.map((cap) => ({
      id: cap.id,
      titulo: cap.titulo,
      orden: cap.orden,
      lecciones: cap.lecciones.map((leccion) => {
        const desbloqueada = leccion.esGratis || suscripcionActiva;
        const progreso = progresoPorLeccion.get(leccion.id);
        return {
          id: leccion.id,
          titulo: leccion.titulo,
          slug: leccion.slug,
          orden: leccion.orden,
          esGratis: leccion.esGratis,
          bloqueada: !desbloqueada,
          urlContenido: desbloqueada ? leccion.urlContenido : null,
          ...(alumnoId
            ? { completada: progreso?.completada ?? false, puntaje: progreso?.puntaje ?? null }
            : {}),
        };
      }),
    })),
  };

  if (alumnoId) {
    const completadas = leccionIds.filter(
      (id) => progresoPorLeccion.get(id)?.completada
    ).length;
    detalle.inscrito = inscrito;
    detalle.suscripcionActiva = suscripcionActiva;
    detalle.porcentaje = leccionIds.length
      ? Math.round((completadas / leccionIds.length) * 100)
      : 0;
    res.json(detalle);
    return;
  }

  try { await setJSON(cacheKeySlug(slug), detalle, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(detalle);
});

export default router;
