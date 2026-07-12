"use client";

import { useState } from "react";
import { PasoCompletar } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";

function normalizar(valor: string): string {
  return valor.trim().toLowerCase();
}

export default function PasoCompletarView({ paso, onResultado }: PasoViewProps<PasoCompletar>) {
  const [respuesta, setRespuesta] = useState("");
  const [verificado, setVerificado] = useState(false);
  const [correcto, setCorrecto] = useState(false);

  function verificar(valor: string) {
    if (verificado) return;
    const esCorrecto = normalizar(valor) === normalizar(paso.respuestaCorrecta);
    setRespuesta(valor);
    setCorrecto(esCorrecto);
    setVerificado(true);
    onResultado(esCorrecto);
  }

  const estiloResultado = !verificado
    ? "border-slate-200"
    : correcto
    ? "border-[#00C4B4] bg-emerald-50"
    : "border-red-500 bg-red-50";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <p className="text-lg text-[#0A2540] leading-relaxed">
        {paso.textoAntes}
        <span
          className={`inline-block min-w-[3rem] mx-1 px-2 border-b-2 text-center font-semibold ${
            verificado ? (correcto ? "border-[#00C4B4] text-[#00C4B4]" : "border-red-500 text-red-500") : "border-slate-300"
          }`}
        >
          {respuesta || " "}
        </span>
        {paso.textoDespues}
      </p>

      {paso.opciones ? (
        <div className="flex flex-wrap gap-2">
          {paso.opciones.map((opcion) => {
            const esElegida = verificado && normalizar(opcion) === normalizar(respuesta);
            let estilo = "border-slate-200 bg-white text-[#0A2540]";
            if (esElegida) {
              estilo = correcto ? "border-[#00C4B4] bg-emerald-50 text-[#0A2540]" : "border-red-500 bg-red-50 text-[#0A2540]";
            }
            return (
              <button
                key={opcion}
                type="button"
                disabled={verificado}
                onClick={() => verificar(opcion)}
                className={`rounded-full border px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed ${estilo}`}
              >
                {opcion}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            disabled={verificado}
            placeholder="Escribí tu respuesta"
            className={`rounded-xl border px-4 py-3 text-[#0A2540] outline-none focus:border-[#00C4B4] disabled:cursor-not-allowed ${estiloResultado}`}
          />
          <button
            type="button"
            disabled={verificado || respuesta.trim().length === 0}
            onClick={() => verificar(respuesta)}
            className="bg-[#00C4B4] hover:bg-[#00C4B4]/90 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verificar
          </button>
        </div>
      )}

      {verificado && !correcto && (
        <p className="text-sm text-slate-500">
          Respuesta correcta: <span className="font-semibold text-[#0A2540]">{paso.respuestaCorrecta}</span>
        </p>
      )}
    </div>
  );
}
