import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CatalogoRutas from "@/components/cursos-online/CatalogoRutas";
import SesionAlumnoBadge from "@/components/alumno/SesionAlumnoBadge";
import { getRutas } from "@/lib/rutas";

export const metadata: Metadata = {
  title: "Cursos de Inglés Online | MEA International",
  description:
    "Elegí tu ruta de aprendizaje: inglés general por niveles (A1-C1) o rutas especializadas para talleres, oficina, viajes, restaurantes, técnicos en computación y call center. Primeras lecciones gratis.",
};

export default async function CursosPage() {
  const rutas = await getRutas();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0A2540] text-white relative">
        <div className="absolute top-5 right-5 z-10">
          <SesionAlumnoBadge />
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Elegí tu ruta de <span className="text-[#00C4B4]">aprendizaje</span>
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl">
            Inglés general completo (A1 a C1) o rutas especializadas para tu profesión: talleres,
            oficina, viajes, restaurantes, técnicos en computación y call center.
            Empezá gratis con las primeras lecciones.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
        <CatalogoRutas rutas={rutas} />

        <div className="mt-16 bg-[#0A2540] rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Desbloqueá todas las rutas con un plan
          </h2>
          <p className="text-slate-300 mb-6 max-w-xl mx-auto">
            Accedé a todas las lecciones, certificados verificables y soporte por WhatsApp.
          </p>
          <Link
            href="/planes"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all shadow-lg shadow-[#00C4B4]/30"
          >
            Ver planes y precios
          </Link>
        </div>
      </main>
    </div>
  );
}
