"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { PasoOpcionMultiple } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";

export default function PasoOpcionMultipleView({
  paso,
  onResultado,
}: PasoViewProps<PasoOpcionMultiple>) {
  const [elegida, setElegida] = useState<number | null>(null);

  function elegir(indice: number) {
    if (elegida !== null) return;
    setElegida(indice);
    onResultado(indice === paso.respuestaCorrecta);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-[#0A2540]">{paso.pregunta}</h2>

      <div className="flex flex-col gap-3">
        {paso.opciones.map((opcion, indice) => {
          const esElegida = elegida === indice;
          const esCorrecta = indice === paso.respuestaCorrecta;
          const mostrarEstado = elegida !== null && (esElegida || esCorrecta);

          let estilo = "border-slate-100 bg-white text-[#0A2540]";
          if (mostrarEstado) {
            estilo = esCorrecta
              ? "border-[#00C4B4] bg-emerald-50 text-[#0A2540]"
              : "border-red-500 bg-red-50 text-[#0A2540]";
          }

          return (
            <button
              key={indice}
              type="button"
              disabled={elegida !== null}
              onClick={() => elegir(indice)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left font-medium transition-colors disabled:cursor-not-allowed ${estilo}`}
            >
              <span>{opcion}</span>
              {mostrarEstado &&
                (esCorrecta ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00C4B4] shrink-0" />
                ) : esElegida ? (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                ) : null)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
