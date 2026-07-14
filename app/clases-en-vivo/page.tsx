import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClasesEnVivoClient from "@/components/clases-en-vivo/ClasesEnVivoClient";
import SesionAlumnoBadge from "@/components/alumno/SesionAlumnoBadge";
import { getHorarioClases } from "@/lib/clases-en-vivo";

export const metadata: Metadata = {
  title: "Clases en Vivo | MEA International",
  description:
    "Horario semanal de clases en vivo grupales de MEA International por Zoom, para niños, adolescentes y adultos de todos los niveles.",
};

export default async function ClasesEnVivoPage() {
  const data = await getHorarioClases();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0A2540] text-white relative">
        <div className="absolute top-5 right-5 z-10">
          <SesionAlumnoBadge />
        </div>
        <div className="max-w-5xl mx-auto px-6 lg:px-16 py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Clases en vivo <span className="text-[#00C4B4]">por Zoom</span>
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl">
            Grupos fijos semanales con profesor en vivo, para todas las edades y niveles.
            Revisá el horario y entrá a tu sala a la hora de tu clase.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 lg:px-16 py-12">
        {data ? (
          <ClasesEnVivoClient inicial={data} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            El horario de clases en vivo estará disponible muy pronto.
          </div>
        )}
      </main>
    </div>
  );
}
