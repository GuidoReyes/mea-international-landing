import type { Metadata } from "next";
import Link from "next/link";
import LeccionClient from "@/components/cursos-online/LeccionClient";
import SesionAlumnoBadge from "@/components/alumno/SesionAlumnoBadge";
import { getRutaCurriculum, type CapituloCurriculum, type LeccionCurriculum, type RutaCurriculum } from "@/lib/rutas";
import { getLeccionContenidoPublico, resumenLegiblePasos } from "@/lib/leccion-contenido";
import { breadcrumbListJsonLd, jsonLdScriptProps, learningResourceJsonLd, OG_IMAGE } from "@/lib/structured-data";

const SITE_URL = "https://www.mea.edu.gt";

interface Props {
  params: Promise<{ slug: string; leccionSlug: string }>;
}

interface LeccionEncontrada {
  ruta: RutaCurriculum;
  capitulo: CapituloCurriculum;
  leccion: LeccionCurriculum;
}

async function buscarLeccion(slug: string, leccionSlug: string): Promise<LeccionEncontrada | null> {
  const ruta = await getRutaCurriculum(slug);
  if (!ruta) return null;
  for (const capitulo of ruta.capitulos) {
    const leccion = capitulo.lecciones.find((l) => l.slug === leccionSlug);
    if (leccion) return { ruta, capitulo, leccion };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, leccionSlug } = await params;
  const encontrada = await buscarLeccion(slug, leccionSlug);

  if (!encontrada) {
    return { title: "Lección no encontrada | MEA International", robots: { index: false, follow: true } };
  }

  const { ruta, capitulo, leccion } = encontrada;
  const title = `${leccion.titulo} | ${ruta.titulo} | MEA International`;
  const canonical = `/cursos/${slug}/leccion/${leccionSlug}`;

  if (!leccion.esGratis) {
    const descripcionPrivada = `Esta lección forma parte del curso ${ruta.titulo} y requiere una suscripción activa a MEA International.`;
    const urlPrivada = `${SITE_URL}${canonical}`;
    // Sin openGraph/twitter explícitos acá, Next.js hereda esos campos del
    // root layout (title/description/url de la home) por el merge de
    // metadata entre segmentos — rompe la vista previa al compartir esta
    // lección por WhatsApp/redes aunque no sea indexable.
    return {
      title,
      description: descripcionPrivada,
      alternates: { canonical },
      robots: { index: false, follow: true },
      openGraph: {
        title,
        description: descripcionPrivada,
        url: urlPrivada,
        siteName: "MEA International",
        locale: "es_GT",
        type: "article",
        images: [OG_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: descripcionPrivada,
        images: [OG_IMAGE],
      },
    };
  }

  const description = `Lección gratuita de inglés "${leccion.titulo}", parte del curso ${ruta.titulo} (nivel ${capitulo.nivel}). Aprendé gratis con MEA International.`;
  const url = `${SITE_URL}${canonical}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url,
      siteName: "MEA International",
      locale: "es_GT",
      type: "article",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function LeccionPage({ params }: Props) {
  const { slug, leccionSlug } = await params;
  const encontrada = await buscarLeccion(slug, leccionSlug);

  const contenido =
    encontrada?.leccion.esGratis ? await getLeccionContenidoPublico(encontrada.leccion.id) : null;
  const resumen = contenido ? resumenLegiblePasos(contenido.pasos) : [];

  const breadcrumbJsonLd = encontrada
    ? breadcrumbListJsonLd([
        { name: "Inicio", url: SITE_URL },
        { name: "Cursos", url: `${SITE_URL}/cursos` },
        { name: encontrada.ruta.titulo, url: `${SITE_URL}/cursos/${slug}` },
        { name: encontrada.leccion.titulo, url: `${SITE_URL}/cursos/${slug}/leccion/${leccionSlug}` },
      ])
    : null;

  const learningResourceJson =
    encontrada?.leccion.esGratis
      ? learningResourceJsonLd({
          name: encontrada.leccion.titulo,
          description: `Lección gratuita de inglés "${encontrada.leccion.titulo}", parte del curso ${encontrada.ruta.titulo}.`,
          url: `${SITE_URL}/cursos/${slug}/leccion/${leccionSlug}`,
          educationalLevel: encontrada.capitulo.nivel,
          cursoNombre: encontrada.ruta.titulo,
          cursoUrl: `${SITE_URL}/cursos/${slug}`,
        })
      : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {breadcrumbJsonLd && <script {...jsonLdScriptProps(breadcrumbJsonLd)} />}
      {learningResourceJson && <script {...jsonLdScriptProps(learningResourceJson)} />}
      <div className="bg-[#0A2540]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex justify-end">
          <SesionAlumnoBadge />
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {encontrada && (
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-slate-400 mb-6 flex items-center gap-1.5 flex-wrap"
          >
            <Link href="/" className="hover:text-[#0A2540] transition-colors">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/cursos" className="hover:text-[#0A2540] transition-colors">
              Cursos
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/cursos/${slug}`} className="hover:text-[#0A2540] transition-colors">
              {encontrada.ruta.titulo}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#0A2540]">{encontrada.leccion.titulo}</span>
          </nav>
        )}

        {encontrada && (
          <h1 className="text-2xl md:text-3xl font-bold text-[#0A2540] mb-2">
            {encontrada.leccion.titulo}
          </h1>
        )}

        {encontrada?.leccion.esGratis && (
          <p className="text-sm text-slate-500 mb-6">
            Lección gratuita del curso {encontrada.ruta.titulo} — nivel {encontrada.capitulo.nivel}.
          </p>
        )}

        {resumen.length > 0 && (
          <ul className="sr-only">
            {resumen.map((linea, i) => (
              <li key={i}>{linea}</li>
            ))}
          </ul>
        )}

        <LeccionClient rutaSlug={slug} leccionSlug={leccionSlug} rutaInicial={encontrada?.ruta} />
      </main>
    </div>
  );
}
