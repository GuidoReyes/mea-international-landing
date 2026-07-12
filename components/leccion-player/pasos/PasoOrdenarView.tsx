"use client";

import { useState } from "react";
import { PasoOrdenar } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";

export default function PasoOrdenarView({ paso, onResultado }: PasoViewProps<PasoOrdenar>) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [verificado, setVerificado] = useState(false);
  const [correcto, setCorrecto] = useState(false);

  function agregar(indice: number) {
    if (verificado || seleccionados.includes(indice)) return;
    setSeleccionados((prev) => [...prev, indice]);
  }

  function quitar(posicion: number) {
    if (verificado) return;
    setSeleccionados((prev) => prev.filter((_, i) => i !== posicion));
  }

  function verificar() {
    if (verificado || seleccionados.length !== paso.palabras.length) return;
    const esCorrecto = seleccionados.every((indice, i) => indice === paso.ordenCorrecto[i]);
    setCorrecto(esCorrecto);
    setVerificado(true);
    onResultado(esCorrecto);
  }

  const disponibles = paso.palabras.map((_, i) => i).filter((i) => !seleccionados.includes(i));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <p className="text-lg font-bold text-[#0A2540]">{paso.instruccion}</p>

      <div
        className={`min-h-[3.5rem] flex flex-wrap gap-2 rounded-xl border-2 border-dashed p-3 ${
          verificado ? (correcto ? "border-[#00C4B4] bg-emerald-50" : "border-red-500 bg-red-50") : "border-slate-200"
        }`}
      >
        {seleccionados.map((indice, posicion) => (
          <button
            key={`${indice}-${posicion}`}
            type="button"
            disabled={verificado}
            onClick={() => quitar(posicion)}
            className="rounded-full border border-[#00C4B4] bg-[#00C4B4]/10 text-[#0A2540] px-4 py-2 font-medium disabled:cursor-not-allowed"
          >
            {paso.palabras[indice]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {disponibles.map((indice) => (
          <button
            key={indice}
            type="button"
            disabled={verificado}
            onClick={() => agregar(indice)}
            className="rounded-full border border-slate-200 bg-white text-[#0A2540] px-4 py-2 font-medium hover:border-[#00C4B4]/50 transition-colors disabled:cursor-not-allowed"
          >
            {paso.palabras[indice]}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={verificado || seleccionados.length !== paso.palabras.length}
        onClick={verificar}
        className="bg-[#00C4B4] hover:bg-[#00C4B4]/90 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Verificar
      </button>
    </div>
  );
}
