"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Star } from "lucide-react";
import { PlanPublico, formatearPrecioCentavos } from "@/lib/cursos-online";

const DURACIONES = [1, 3, 6, 12] as const;

function DiscountBadge({ porcentaje }: { porcentaje: number }) {
  if (porcentaje <= 0) return null;
  return (
    <span className="text-xs font-bold text-[#00C4B4] bg-[#00C4B4]/10 px-2 py-0.5 rounded-full">
      Ahorra {porcentaje}%
    </span>
  );
}

function PriceCard({
  plan,
  duracionMeses,
  nivel,
}: {
  plan: PlanPublico;
  duracionMeses: number;
  nivel: string | null;
}) {
  const precio = plan.precios.find((p) => p.duracionMeses === duracionMeses);
  if (!precio) return null;

  const precioMes = formatearPrecioCentavos(precio.precioMesCentavos, precio.moneda);
  const total = formatearPrecioCentavos(precio.precioTotalCentavos, precio.moneda);
  const regular = formatearPrecioCentavos(precio.precioRegularCentavos, precio.moneda);
  const hayDescuento = precio.ahorroPorcentaje > 0;

  return (
    <div
      className={`relative bg-white rounded-2xl border shadow-sm p-8 flex flex-col ${
        plan.recomendado ? "border-[#00C4B4] shadow-lg shadow-[#00C4B4]/10" : "border-slate-100"
      }`}
    >
      {plan.recomendado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-[#00C4B4] text-white text-xs font-bold px-4 py-1 rounded-full">
          <Star className="w-3 h-3 fill-current" /> Recomendado
        </span>
      )}

      <h3 className="text-xl font-bold text-[#0A2540]">{plan.nombre}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-6">{plan.descripcion}</p>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-[#0A2540]">{precioMes}</span>
        <span className="text-slate-400 text-sm">/mes</span>
        <DiscountBadge porcentaje={precio.ahorroPorcentaje} />
      </div>
      <p className="text-xs text-slate-400 mb-6">
        {hayDescuento && <span className="line-through mr-2">{regular}</span>}
        <span>
          {total} en total por {duracionMeses} {duracionMeses === 1 ? "mes" : "meses"}
        </span>
      </p>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature) => {
          const esClasesEnVivo = feature.toLowerCase().includes("clases en vivo");
          return (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
              <Check className="w-4 h-4 text-[#00C4B4] mt-0.5 shrink-0" />
              {esClasesEnVivo ? (
                <Link href="/clases-en-vivo" className="hover:text-[#00C4B4] hover:underline transition-colors">
                  {feature}
                </Link>
              ) : (
                feature
              )}
            </li>
          );
        })}
      </ul>

      <Link
        href={`/checkout/${precio.id}${nivel ? `?nivel=${nivel}` : ""}`}
        className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold transition-all ${
          plan.recomendado
            ? "bg-[#00C4B4] text-white hover:bg-[#00a898] shadow-lg shadow-[#00C4B4]/30"
            : "bg-[#0A2540] text-white hover:bg-[#0d2f4f]"
        }`}
      >
        Elegir este plan <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function PricingPlanes({
  planes,
  nivel = null,
}: {
  planes: PlanPublico[];
  nivel?: string | null;
}) {
  const [duracion, setDuracion] = useState<number>(3);

  if (planes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
        Los planes estarán disponibles muy pronto. Escribinos por WhatsApp para más información.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 gap-1">
          {DURACIONES.map((meses) => (
            <button
              key={meses}
              onClick={() => setDuracion(meses)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                duracion === meses
                  ? "bg-[#0A2540] text-white shadow"
                  : "text-slate-500 hover:text-[#0A2540]"
              }`}
            >
              {meses} {meses === 1 ? "mes" : "meses"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {planes.map((plan) => (
          <PriceCard key={plan.id} plan={plan} duracionMeses={duracion} nivel={nivel} />
        ))}
      </div>
    </div>
  );
}
