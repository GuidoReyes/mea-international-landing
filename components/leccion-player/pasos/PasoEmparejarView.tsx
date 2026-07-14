"use client";

import { useState } from "react";
import { PasoEmparejar } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";

interface ItemDerecha {
  indice: number;
  texto: string;
}

function mezclar<T>(items: T[]): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function PasoEmparejarView({ paso, onResultado }: PasoViewProps<PasoEmparejar>) {
  const [derechaOrden] = useState<ItemDerecha[]>(() =>
    mezclar(paso.pares.map((par, indice) => ({ indice, texto: par.derecha })))
  );
  const [seleccionIzquierda, setSeleccionIzquierda] = useState<number | null>(null);
  const [seleccionDerecha, setSeleccionDerecha] = useState<number | null>(null);
  const [emparejados, setEmparejados] = useState<Set<number>>(new Set());
  const [error, setError] = useState<{ izquierda: number; derecha: number } | null>(null);
  const [huboError, setHuboError] = useState(false);

  function evaluar(izquierda: number, derecha: number) {
    if (izquierda === derecha) {
      const nuevos = new Set(emparejados);
      nuevos.add(izquierda);
      setEmparejados(nuevos);
      setSeleccionIzquierda(null);
      setSeleccionDerecha(null);
      if (nuevos.size === paso.pares.length) {
        onResultado(!huboError);
      }
      return;
    }
    setHuboError(true);
    setError({ izquierda, derecha });
    setTimeout(() => {
      setError(null);
      setSeleccionIzquierda(null);
      setSeleccionDerecha(null);
    }, 700);
  }

  function elegirIzquierda(indice: number) {
    if (emparejados.has(indice) || error) return;
    setSeleccionIzquierda(indice);
    if (seleccionDerecha !== null) evaluar(indice, seleccionDerecha);
  }

  function elegirDerecha(indice: number) {
    if (emparejados.has(indice) || error) return;
    setSeleccionDerecha(indice);
    if (seleccionIzquierda !== null) evaluar(seleccionIzquierda, indice);
  }

  function estiloBoton(indice: number, seleccion: number | null, esIzquierda: boolean) {
    const emparejado = emparejados.has(indice);
    const seleccionado = seleccion === indice;
    const conError = esIzquierda ? error?.izquierda === indice : error?.derecha === indice;
    if (emparejado) return "border-[#00C4B4] bg-emerald-50 text-[#0A2540] opacity-70";
    if (conError) return "border-red-500 bg-red-50 text-[#0A2540] animate-shake";
    if (seleccionado) return "border-[#00C4B4] bg-[#00C4B4]/10 text-[#0A2540]";
    return "border-slate-200 bg-white text-[#0A2540] hover:border-[#00C4B4]/50 hover:bg-slate-50";
  }

  const completo = emparejados.size === paso.pares.length;

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-5 transition-colors ${
        completo ? (huboError ? "border-red-400" : "border-[#00C4B4] animate-pop-correct") : "border-slate-100"
      }`}
    >
      <p className="text-lg font-bold text-[#0A2540]">{paso.instruccion}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {paso.pares.map((par, indice) => (
            <button
              key={indice}
              type="button"
              disabled={emparejados.has(indice)}
              onClick={() => elegirIzquierda(indice)}
              className={`rounded-2xl border-2 px-3 py-3 text-sm font-semibold text-left active:scale-[0.98] transition-all disabled:cursor-not-allowed ${estiloBoton(
                indice,
                seleccionIzquierda,
                true
              )}`}
            >
              {par.izquierda}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {derechaOrden.map((item) => (
            <button
              key={item.indice}
              type="button"
              disabled={emparejados.has(item.indice)}
              onClick={() => elegirDerecha(item.indice)}
              className={`rounded-2xl border-2 px-3 py-3 text-sm font-semibold text-left active:scale-[0.98] transition-all disabled:cursor-not-allowed ${estiloBoton(
                item.indice,
                seleccionDerecha,
                false
              )}`}
            >
              {item.texto}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
