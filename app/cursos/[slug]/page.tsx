import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RutaDetalleClient from "@/components/cursos-online/RutaDetalleClient";
import { getRutaCurriculum, colorBadgeNivel } from "@/lib/rutas";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ruta = await getRutaCurriculum(slug);
  if (!ruta) return { title: "Ruta no encontrada | MEA International" };
  return {
    title: `${ruta.titulo} | MEA International`,
    description: ruta.descripcion,
  };
}

export default async function RutaDetallePage({ params }: Props) {
  const { slug } = await params;
  const ruta = await getRutaCurriculum(slug);
  if (!ruta) notFound();

  const totalLecciones = ruta.capitulos.reduce((sum, cap) => sum + cap.lecciones.length, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0A2540] text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
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
        <RutaDetalleClient inicial={ruta} />
      </main>
    </div>
  );
}
