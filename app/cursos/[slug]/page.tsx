import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RutaDetalleClient from "@/components/cursos-online/RutaDetalleClient";
import SesionAlumnoBadge from "@/components/alumno/SesionAlumnoBadge";
import { getRutaCurriculum, colorBadgeNivel } from "@/lib/rutas";
import { breadcrumbListJsonLd, courseJsonLd, jsonLdScriptProps, OG_IMAGE } from "@/lib/structured-data";
import { cursoIntroParrafos, getCursoIntroEditorial } from "@/lib/curso-intro";

const SITE_URL = "https://www.mea.edu.gt";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ruta = await getRutaCurriculum(slug);
  if (!ruta) return { title: "Ruta no encontrada | MEA International" };

  const title = `${ruta.titulo} | MEA International`;
  const description = `${ruta.descripcion} Nivel ${ruta.nivelMinimo}–${ruta.nivelMaximo}.`;
  const url = `${SITE_URL}/cursos/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/cursos/${slug}`,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "MEA International",
      locale: "es_GT",
      type: "website",
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

export default async function RutaDetallePage({ params }: Props) {
  const { slug } = await params;
  const ruta = await getRutaCurriculum(slug);
  if (!ruta) notFound();

  const totalLecciones = ruta.capitulos.reduce((sum, cap) => sum + cap.lecciones.length, 0);

  const breadcrumbJsonLd = breadcrumbListJsonLd([
    { name: "Inicio", url: SITE_URL },
    { name: "Cursos", url: `${SITE_URL}/cursos` },
    { name: ruta.titulo, url: `${SITE_URL}/cursos/${slug}` },
  ]);
  const courseJson = courseJsonLd({
    name: ruta.titulo,
    description: ruta.descripcion,
    url: `${SITE_URL}/cursos/${slug}`,
  });

  const introEditorial = getCursoIntroEditorial(slug);
  const introParrafos = introEditorial ? cursoIntroParrafos(ruta, introEditorial) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <script {...jsonLdScriptProps(breadcrumbJsonLd)} />
      <script {...jsonLdScriptProps(courseJson)} />
      <header className="bg-[#0A2540] text-white relative">
        <div className="absolute top-5 right-5 z-10">
          <SesionAlumnoBadge />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-300 mb-6 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/cursos" className="hover:text-white transition-colors">
              Cursos
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white">{ruta.titulo}</span>
          </nav>
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Todas las rutas
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4 ${colorBadgeNivel(
              ruta.nivelMinimo,
              ruta.nivelMaximo
            )}`}
          >
            Nivel {ruta.nivelMinimo}–{ruta.nivelMaximo}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{ruta.titulo}</h1>
          <p className="text-slate-300 text-lg mt-4">{ruta.descripcion}</p>
          <p className="text-slate-400 text-sm mt-4">
            {ruta.capitulos.length} capítulos · {totalLecciones} lecciones
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {introParrafos && (
          <section className="mb-12 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-[#0A2540] mb-4">Sobre este curso</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              {introParrafos.map((parrafo, i) => (
                <p key={i}>{parrafo}</p>
              ))}
            </div>
          </section>
        )}
        <RutaDetalleClient inicial={ruta} />
      </main>
    </div>
  );
}
