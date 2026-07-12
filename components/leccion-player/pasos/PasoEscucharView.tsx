"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import { PasoEscuchar } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";

export default function PasoEscucharView({ paso, onResultado }: PasoViewProps<PasoEscuchar>) {
  const [elegida, setElegida] = useState<number | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function reproducir() {
    if (!audioRef.current) {
      audioRef.current = new Audio(paso.audioUrl);
      audioRef.current.addEventListener("ended", () => setReproduciendo(false));
    }
    setReproduciendo(true);
    audioRef.current.currentTime = 0;
    void audioRef.current.play().finally(() => {
      if (audioRef.current?.paused) setReproduciendo(false);
    });
  }

  function elegir(indice: number) {
    if (elegida !== null) return;
    setElegida(indice);
    onResultado(indice === paso.respuestaCorrecta);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={reproducir}
        aria-label="Reproducir audio"
        className={`flex items-center justify-center w-20 h-20 rounded-full bg-[#00C4B4] text-white shadow-md hover:bg-[#00C4B4]/90 transition-colors ${
          reproduciendo ? "animate-pulse" : ""
        }`}
      >
        <Play className="w-8 h-8 ml-1" fill="currentColor" />
      </button>

      <div className="w-full flex flex-col gap-3">
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
