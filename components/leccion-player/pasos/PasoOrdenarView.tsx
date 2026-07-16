"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Volume2 } from "lucide-react";
import { PasoOrdenar } from "@/lib/leccion-contenido";
import { PasoViewHandle, PasoViewProps } from "./types";
import { sayWord } from "@/lib/say-word";

const PasoOrdenarView = forwardRef<PasoViewHandle, PasoViewProps<PasoOrdenar>>(
  ({ paso, onResultado, onPuedeVerificarChange }, ref) => {
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [verificado, setVerificado] = useState(false);
    const [correcto, setCorrecto] = useState(false);

    const listo = seleccionados.length === paso.palabras.length;

    useEffect(() => {
      onPuedeVerificarChange?.(listo && !verificado);
    }, [listo, verificado, onPuedeVerificarChange]);

    useImperativeHandle(ref, () => ({
      verificar() {
        if (verificado || !listo) return;
        const esCorrecto = seleccionados.every((indice, i) => indice === paso.ordenCorrecto[i]);
        setCorrecto(esCorrecto);
        setVerificado(true);
        onResultado(esCorrecto);
      },
    }));

    function agregar(indice: number) {
      if (verificado || seleccionados.includes(indice)) return;
      setSeleccionados((prev) => [...prev, indice]);
    }

    function quitar(posicion: number) {
      if (verificado) return;
      setSeleccionados((prev) => prev.filter((_, i) => i !== posicion));
    }

    const disponibles = paso.palabras.map((_, i) => i).filter((i) => !seleccionados.includes(i));

    return (
      <div
        className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-5 transition-colors ${
          !verificado ? "border-slate-100" : correcto ? "border-[#00C4B4]" : "border-red-400"
        } ${verificado && !correcto ? "animate-shake" : ""} ${verificado && correcto ? "animate-pop-correct" : ""}`}
      >
        <p className="text-lg font-bold text-[#0A2540]">{paso.instruccion}</p>

        <div
          className={`min-h-[3.5rem] flex flex-wrap gap-2 rounded-xl border-2 border-dashed p-3 transition-colors ${
            verificado ? (correcto ? "border-[#00C4B4] bg-emerald-50" : "border-red-400 bg-red-50") : "border-slate-200"
          }`}
        >
          {seleccionados.map((indice, posicion) => (
            <button
              key={`${indice}-${posicion}`}
              type="button"
              disabled={verificado}
              onClick={() => quitar(posicion)}
              className="rounded-2xl border-2 border-[#00C4B4] bg-[#00C4B4]/10 text-[#0A2540] px-4 py-2.5 font-semibold active:scale-95 transition-transform disabled:cursor-not-allowed"
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
              className="rounded-2xl border-2 border-slate-200 bg-white text-[#0A2540] px-4 py-2.5 font-semibold hover:border-[#00C4B4]/50 hover:bg-slate-50 active:scale-95 transition-all disabled:cursor-not-allowed"
            >
              {paso.palabras[indice]}
            </button>
          ))}
        </div>

        {verificado && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            {!correcto && (
              <>
                Orden correcto:{" "}
                <span className="font-semibold text-[#0A2540]">
                  {paso.ordenCorrecto.map((i) => paso.palabras[i]).join(" ")}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => sayWord(paso.ordenCorrecto.map((i) => paso.palabras[i]).join(" "), paso.audioUrl)}
              aria-label="Escuchar frase correcta"
              className="inline-flex items-center justify-center rounded-full bg-[#00C4B4]/10 text-[#00C4B4] hover:bg-[#00C4B4]/20 transition-colors p-1.5 shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </p>
        )}
      </div>
    );
  }
);

PasoOrdenarView.displayName = "PasoOrdenarView";
export default PasoOrdenarView;
