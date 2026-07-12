"use client";

import { useMemo, useState } from "react";
import type { LeccionContenido, PasoLeccion } from "@/lib/leccion-contenido";
import PasoVocabularioView from "./pasos/PasoVocabularioView";
import PasoOpcionMultipleView from "./pasos/PasoOpcionMultipleView";
import PasoCompletarView from "./pasos/PasoCompletarView";
import PasoOrdenarView from "./pasos/PasoOrdenarView";
import PasoEmparejarView from "./pasos/PasoEmparejarView";
import PasoEscucharView from "./pasos/PasoEscucharView";

interface Props {
  contenido: LeccionContenido;
  onTerminado: (puntaje: number) => void;
}

const UMBRAL_EXCELENTE = 80;
const UMBRAL_BIEN = 60;

function mensajePorPuntaje(puntaje: number): string {
  if (puntaje >= UMBRAL_EXCELENTE) return "¡Excelente!";
  if (puntaje >= UMBRAL_BIEN) return "¡Bien hecho!";
  return "Seguí practicando";
}

function renderPasoView(paso: PasoLeccion, onResultado: (correcto: boolean) => void) {
  switch (paso.tipo) {
    case "vocabulario":
      return <PasoVocabularioView paso={paso} onResultado={onResultado} />;
    case "opcion_multiple":
      return <PasoOpcionMultipleView paso={paso} onResultado={onResultado} />;
    case "completar":
      return <PasoCompletarView paso={paso} onResultado={onResultado} />;
    case "ordenar":
      return <PasoOrdenarView paso={paso} onResultado={onResultado} />;
    case "emparejar":
      return <PasoEmparejarView paso={paso} onResultado={onResultado} />;
    case "escuchar":
      return <PasoEscucharView paso={paso} onResultado={onResultado} />;
    default: {
      const pasoNuncaAlcanzado: never = paso;
      throw new Error(`Tipo de paso no soportado: ${JSON.stringify(pasoNuncaAlcanzado)}`);
    }
  }
}

export default function LessonPlayer({ contenido, onTerminado }: Props) {
  const { pasos } = contenido;
  const [indice, setIndice] = useState(0);
  const [respondido, setRespondido] = useState(false);
  const [resultados, setResultados] = useState<Record<string, boolean>>({});
  const [terminado, setTerminado] = useState(false);

  const pasosEvaluables = useMemo(() => pasos.filter((p) => p.tipo !== "vocabulario"), [pasos]);

  const puntaje = useMemo(() => {
    if (pasosEvaluables.length === 0) return 100;
    const correctos = pasosEvaluables.filter((p) => resultados[p.id]).length;
    return Math.round((100 * correctos) / pasosEvaluables.length);
  }, [pasosEvaluables, resultados]);

  const pasoActual = pasos[indice];
  const respondidosCount = Object.keys(resultados).length;
  const progresoPct = pasos.length === 0 ? 0 : Math.round((100 * respondidosCount) / pasos.length);

  function avanzar() {
    if (indice + 1 >= pasos.length) {
      setTerminado(true);
      return;
    }
    setIndice((i) => i + 1);
    setRespondido(false);
  }

  function handleResultado(correcto: boolean) {
    if (!pasoActual) return;
    setResultados((prev) => ({ ...prev, [pasoActual.id]: correcto }));
    if (pasoActual.tipo === "vocabulario") {
      avanzar();
      return;
    }
    setRespondido(true);
  }

  if (terminado) {
    return (
      <div className="bg-[#f8fafc] rounded-2xl p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-6xl font-bold text-[#0A2540] mb-3">{puntaje}%</p>
          <p className="text-lg text-slate-500 mb-8">{mensajePorPuntaje(puntaje)}</p>
          <button
            onClick={() => onTerminado(puntaje)}
            className="inline-flex items-center px-8 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
          >
            Finalizar lección
          </button>
        </div>
      </div>
    );
  }

  if (!pasoActual) return null;

  return (
    <div className="bg-[#f8fafc] rounded-2xl p-4 md:p-6">
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#00C4B4] transition-all duration-300 ease-out"
          style={{ width: `${progresoPct}%` }}
        />
      </div>

      {renderPasoView(pasoActual, handleResultado)}

      {respondido && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={avanzar}
            className="inline-flex items-center px-8 py-3 bg-[#0A2540] text-white rounded-full font-bold hover:bg-[#0d2f4f] transition-all"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
