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
  const [correcto, setCorrecto] = useState(false);

  function elegir(indice: number) {
    if (elegida !== null) return;
    const esCorrecto = indice === paso.respuestaCorrecta;
    setElegida(indice);
    setCorrecto(esCorrecto);
    onResultado(esCorrecto);
  }

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-5 transition-colors ${
        elegida === null ? "border-slate-100" : correcto ? "border-[#00C4B4]" : "border-red-400"
      } ${elegida !== null && !correcto ? "animate-shake" : ""} ${elegida !== null && correcto ? "animate-pop-correct" : ""}`}
    >
      <h2 className="text-lg font-bold text-[#0A2540]">{paso.pregunta}</h2>

      <div className="flex flex-col gap-3">
        {paso.opciones.map((opcion, indice) => {
          const esElegida = elegida === indice;
          const esCorrecta = indice === paso.respuestaCorrecta;
          const mostrarEstado = elegida !== null && (esElegida || esCorrecta);

          let estilo = "border-slate-200 bg-white text-[#0A2540] hover:border-[#00C4B4]/50 hover:bg-slate-50";
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
              className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-5 py-4 text-left font-semibold active:scale-[0.98] transition-all disabled:cursor-not-allowed ${estilo}`}
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
