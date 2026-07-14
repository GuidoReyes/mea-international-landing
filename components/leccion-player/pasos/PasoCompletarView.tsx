"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { PasoCompletar } from "@/lib/leccion-contenido";
import { PasoViewHandle, PasoViewProps } from "./types";

function normalizar(valor: string): string {
  return valor.trim().toLowerCase();
}

const PasoCompletarView = forwardRef<PasoViewHandle, PasoViewProps<PasoCompletar>>(
  ({ paso, onResultado, onPuedeVerificarChange }, ref) => {
    const [respuesta, setRespuesta] = useState("");
    const [verificado, setVerificado] = useState(false);
    const [correcto, setCorrecto] = useState(false);
    const modoTexto = !paso.opciones;

    function verificar(valor: string) {
      if (verificado) return;
      const esCorrecto = normalizar(valor) === normalizar(paso.respuestaCorrecta);
      setRespuesta(valor);
      setCorrecto(esCorrecto);
      setVerificado(true);
      onResultado(esCorrecto);
    }

    // Solo el modo texto libre usa el "Verificar" externo de la barra inferior;
    // el modo chips verifica al toque, igual que opción múltiple.
    useEffect(() => {
      if (!modoTexto) return;
      onPuedeVerificarChange?.(respuesta.trim().length > 0 && !verificado);
    }, [modoTexto, respuesta, verificado, onPuedeVerificarChange]);

    useImperativeHandle(ref, () => ({
      verificar() {
        if (!modoTexto || respuesta.trim().length === 0) return;
        verificar(respuesta);
      },
    }));

    const estiloResultado = !verificado
      ? "border-slate-200"
      : correcto
      ? "border-[#00C4B4] text-[#00C4B4]"
      : "border-red-500 text-red-500";

    return (
      <div
        className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-5 transition-colors ${
          !verificado ? "border-slate-100" : correcto ? "border-[#00C4B4]" : "border-red-400"
        } ${verificado && !correcto ? "animate-shake" : ""} ${verificado && correcto ? "animate-pop-correct" : ""}`}
      >
        <p className="text-lg text-[#0A2540] leading-relaxed">
          {paso.textoAntes}
          <span className={`inline-block min-w-[3rem] mx-1 px-2 border-b-2 text-center font-semibold ${estiloResultado}`}>
            {respuesta || " "}
          </span>
          {paso.textoDespues}
        </p>

        {paso.opciones ? (
          <div className="flex flex-wrap gap-2">
            {paso.opciones.map((opcion) => {
              const esElegida = verificado && normalizar(opcion) === normalizar(respuesta);
              let estilo = "border-slate-200 bg-white text-[#0A2540] hover:border-[#00C4B4]/50 hover:bg-slate-50";
              if (esElegida) {
                estilo = correcto ? "border-[#00C4B4] bg-emerald-50 text-[#0A2540]" : "border-red-500 bg-red-50 text-[#0A2540]";
              }
              return (
                <button
                  key={opcion}
                  type="button"
                  disabled={verificado}
                  onClick={() => verificar(opcion)}
                  className={`rounded-2xl border-2 px-4 py-2.5 font-semibold active:scale-95 transition-all disabled:cursor-not-allowed ${estilo}`}
                >
                  {opcion}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type="text"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            disabled={verificado}
            placeholder="Escribí tu respuesta"
            className={`rounded-xl border-2 px-4 py-3 text-[#0A2540] outline-none focus:border-[#00C4B4] disabled:cursor-not-allowed ${
              verificado ? (correcto ? "border-[#00C4B4] bg-emerald-50" : "border-red-500 bg-red-50") : "border-slate-200"
            }`}
          />
        )}

        {verificado && !correcto && (
          <p className="text-sm text-slate-500">
            Respuesta correcta: <span className="font-semibold text-[#0A2540]">{paso.respuestaCorrecta}</span>
          </p>
        )}
      </div>
    );
  }
);

PasoCompletarView.displayName = "PasoCompletarView";
export default PasoCompletarView;
