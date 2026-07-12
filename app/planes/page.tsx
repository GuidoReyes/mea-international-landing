import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PricingPlanes from "@/components/planes/PricingPlanes";
import { getPlanes } from "@/lib/cursos-online";

export const metadata: Metadata = {
  title: "Planes y Precios | MEA International",
  description:
    "Planes de suscripción de MEA International: cursos de inglés autoguiados, clases en vivo y certificados. Ahorrá hasta 30% con planes de 3, 6 o 12 meses.",
};

export default async function PlanesPage() {
  const planes = await getPlanes();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0A2540] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-16 text-center">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Ver cursos
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Elegí tu plan y <span className="text-[#00C4B4]">empezá hoy</span>
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto">
            Mientras más meses contratás, más ahorrás. Todos los planes incluyen acceso completo
            al catálogo de cursos y certificados verificables.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
        <PricingPlanes planes={planes} />

        <p className="text-center text-xs text-slate-400 mt-10 max-w-lg mx-auto">
          El pago se coordina por WhatsApp con nuestro equipo (transferencia, depósito o tarjeta).
          Muy pronto: pago automático en línea.
        </p>
      </main>
    </div>
  );
}
