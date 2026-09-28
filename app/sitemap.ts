import type { MetadataRoute } from "next";
import { getRutas, getRutaCurriculum, type LeccionCurriculum } from "@/lib/rutas";
import { getLeccionContenidoPublico, isLessonPublished } from "@/lib/leccion-contenido";

const BASE = "https://www.mea.edu.gt";

// Sitemap dinámico: home + secciones + rutas + lecciones GRATIS (las públicas,
// indexables sin login — ventaja SEO frente a competidores que exigen cuenta).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/cursos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/planes`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/clases-en-vivo`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const rutas = await getRutas().catch(() => []);
  const paginasRutas: MetadataRoute.Sitemap = rutas.map((r) => ({
    url: `${BASE}/cursos/${r.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const candidatas: { rutaSlug: string; leccion: LeccionCurriculum }[] = [];
  for (const r of rutas) {
    const curriculum = await getRutaCurriculum(r.slug).catch(() => null);
    if (!curriculum) continue;
    for (const capitulo of curriculum.capitulos) {
      for (const leccion of capitulo.lecciones) {
        if (leccion.esGratis) candidatas.push({ rutaSlug: r.slug, leccion });
      }
    }
  }

  // esGratis no alcanza: una lección sin pasos reales (contenido en
  // preparación) no debe aparecer en el sitemap aunque sea gratuita.
  const publicadas = await Promise.all(
    candidatas.map(async (c) => {
      const contenido = await getLeccionContenidoPublico(c.leccion.id).catch(() => null);
      return isLessonPublished(contenido) ? c : null;
    }),
  );

  const leccionesGratis: MetadataRoute.Sitemap = publicadas
    .filter((c): c is { rutaSlug: string; leccion: LeccionCurriculum } => c !== null)
    .map((c) => ({
      url: `${BASE}/cursos/${c.rutaSlug}/leccion/${c.leccion.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...estaticas, ...paginasRutas, ...leccionesGratis];
}
