import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CheckoutClient from "@/components/planes/CheckoutClient";
import { getPlanes } from "@/lib/cursos-online";

export const metadata: Metadata = {
  title: "Checkout | MEA International",
  description: "Confirmá tu plan de suscripción de MEA International.",
};

interface Props {
  params: Promise<{ planPrecioId: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { planPrecioId } = await params;
  const id = parseInt(planPrecioId, 10);
  if (isNaN(id)) notFound();

  const planes = await getPlanes();
  const plan = planes.find((p) => p.precios.some((precio) => precio.id === id));
  const precio = plan?.precios.find((precio) => precio.id === id);
  if (!plan || !precio) notFound();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main className="max-w-lg mx-auto px-6 py-16">
        <Link
          href="/planes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A2540] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a planes
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A2540] mb-8">Confirmá tu plan</h1>
        <CheckoutClient plan={plan} precio={precio} />
      </main>
    </div>
  );
}
