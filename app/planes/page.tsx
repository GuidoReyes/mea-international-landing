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

const NIVELES_VALIDOS = ["A1", "A2", "B1", "B2", "C1"] as const;

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string }>;
}) {
  const planes = await getPlanes();
  const { nivel: nivelRaw } = await searchParams;
  const nivel = NIVELES_VALIDOS.find((n) => n === nivelRaw?.toUpperCase()) ?? null;

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
          {nivel && (
            <span className="inline-flex items-center gap-2 mt-6 bg-[#00C4B4]/15 border border-[#00C4B4]/40 text-[#00C4B4] text-sm font-bold px-5 py-2 rounded-full">
              Empezando desde nivel {nivel} — cualquier plan te da acceso a tu nivel
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
        <PricingPlanes planes={planes} nivel={nivel} />

        <p className="text-center text-xs text-slate-400 mt-10 max-w-lg mx-auto">
          El pago se coordina por WhatsApp con nuestro equipo (transferencia, depósito o tarjeta).
          Muy pronto: pago automático en línea.
        </p>
      </main>
    </div>
  );
}
