"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import type { LeccionContenido, PasoLeccion } from "@/lib/leccion-contenido";
import PasoVocabularioView from "./pasos/PasoVocabularioView";
import PasoOpcionMultipleView from "./pasos/PasoOpcionMultipleView";
import PasoCompletarView from "./pasos/PasoCompletarView";
import PasoOrdenarView from "./pasos/PasoOrdenarView";
import PasoEmparejarView from "./pasos/PasoEmparejarView";
import PasoEscucharView from "./pasos/PasoEscucharView";
import type { PasoViewHandle } from "./pasos/types";

interface Props {
  contenido: LeccionContenido;
  // Con sesión: guarda el progreso (puede ser async). Sin sesión: el padre
  // abre el registro para que el alumno pueda guardar su puntaje.
  onTerminado: (puntaje: number) => void | Promise<void>;
  sesionActiva: boolean;
  // Ruta a la que vuelve la X de salir (ej. "/cursos/general"). Sin esto, el
  // botón de salir no se muestra.
  rutaHref?: string;
}

const UMBRAL_EXCELENTE = 80;
const UMBRAL_BIEN = 60;

function mensajePorPuntaje(puntaje: number): string {
  if (puntaje >= UMBRAL_EXCELENTE) return "¡Excelente!";
  if (puntaje >= UMBRAL_BIEN) return "¡Bien hecho!";
  return "Seguí practicando";
}

// ─── Rotación de preguntas ────────────────────────────────────────────────────
// Cada vez que se abre la lección: los ejercicios rotan de orden entre sus
// posiciones (las tarjetas de vocabulario no se mueven — enseñan antes de
// evaluar) y las opciones de respuesta se barajan. Así repetir la lección no
// es memorizar posiciones.

function barajar<T>(arr: readonly T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

function barajarOpciones(paso: PasoLeccion): PasoLeccion {
  if (paso.tipo === "opcion_multiple" || paso.tipo === "escuchar") {
    const orden = barajar(paso.opciones.map((_, i) => i));
    return {
      ...paso,
      opciones: orden.map((i) => paso.opciones[i]!),
      respuestaCorrecta: orden.indexOf(paso.respuestaCorrecta),
    };
  }
  if (paso.tipo === "completar" && paso.opciones) {
    // La respuesta correcta es un string (no un índice): barajar es seguro.
    return { ...paso, opciones: barajar(paso.opciones) };
  }
  return paso;
}

function rotarPasos(pasos: readonly PasoLeccion[]): PasoLeccion[] {
  const slotsEjercicio = pasos
    .map((p, i) => (p.tipo === "vocabulario" ? -1 : i))
    .filter((i) => i >= 0);
  const ejerciciosRotados = barajar(slotsEjercicio.map((i) => pasos[i]!));

  const resultado = [...pasos];
  slotsEjercicio.forEach((slot, k) => {
    resultado[slot] = barajarOpciones(ejerciciosRotados[k]!);
  });
  return resultado;
}

// key={paso.id}: sin él, React reutiliza la instancia cuando dos pasos seguidos
// son del mismo tipo, y el estado interno (audio cacheado, selecciones, inputs)
// se arrastra del paso anterior.
// ref: solo "ordenar" y "completar" (modo texto) exponen un verificar()
// imperativo para el botón "Verificar" de la barra inferior; el resto verifica
// al tocar la tarjeta y no acepta ref (no son forwardRef).
function renderPasoView(
  paso: PasoLeccion,
  onResultado: (correcto: boolean) => void,
  onPuedeVerificarChange: (puede: boolean) => void,
  ref: React.Ref<PasoViewHandle>
) {
  switch (paso.tipo) {
    case "vocabulario":
      return <PasoVocabularioView key={paso.id} paso={paso} onResultado={onResultado} />;
    case "opcion_multiple":
      return <PasoOpcionMultipleView key={paso.id} paso={paso} onResultado={onResultado} />;
    case "completar":
      return (
        <PasoCompletarView
          key={paso.id}
          ref={ref}
          paso={paso}
          onResultado={onResultado}
          onPuedeVerificarChange={onPuedeVerificarChange}
        />
      );
    case "ordenar":
      return (
        <PasoOrdenarView
          key={paso.id}
          ref={ref}
          paso={paso}
          onResultado={onResultado}
          onPuedeVerificarChange={onPuedeVerificarChange}
        />
      );
    case "emparejar":
      return <PasoEmparejarView key={paso.id} paso={paso} onResultado={onResultado} />;
    case "escuchar":
      return <PasoEscucharView key={paso.id} paso={paso} onResultado={onResultado} />;
    default: {
      const pasoNuncaAlcanzado: never = paso;
      throw new Error(`Tipo de paso no soportado: ${JSON.stringify(pasoNuncaAlcanzado)}`);
    }
  }
}

type EstadoGuardado = "pendiente" | "guardando" | "guardado" | "error";

export default function LessonPlayer({ contenido, onTerminado, sesionActiva, rutaHref }: Props) {
  // La rotación se calcula UNA vez por montaje (jugar de nuevo = nueva rotación).
  const pasos = useMemo(() => rotarPasos(contenido.pasos), [contenido]);
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<Record<string, boolean>>({});
  const [terminado, setTerminado] = useState(false);
  const [guardado, setGuardado] = useState<EstadoGuardado>("pendiente");
  const [puedeVerificar, setPuedeVerificar] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const pasoViewRef = useRef<PasoViewHandle>(null);

  const pasosEvaluables = useMemo(() => pasos.filter((p) => p.tipo !== "vocabulario"), [pasos]);
  const puntosPorPregunta =
    pasosEvaluables.length === 0 ? 0 : Math.round(100 / pasosEvaluables.length);

  const correctos = pasosEvaluables.filter((p) => resultados[p.id] === true).length;
  const evaluadas = pasosEvaluables.filter((p) => p.id in resultados).length;

  const puntaje = useMemo(() => {
    if (pasosEvaluables.length === 0) return 100;
    return Math.round((100 * correctos) / pasosEvaluables.length);
  }, [pasosEvaluables, correctos]);

  const pasoActual = pasos[indice];
  const respondidosCount = Object.keys(resultados).length;
  const progresoPct = pasos.length === 0 ? 0 : Math.round((100 * respondidosCount) / pasos.length);
  const respondido = pasoActual ? pasoActual.id in resultados : false;
  const ultimoResultado = pasoActual ? resultados[pasoActual.id] : undefined;

  const necesitaVerificarExplicito =
    pasoActual?.tipo === "ordenar" || (pasoActual?.tipo === "completar" && !pasoActual.opciones);

  function avanzar() {
    setPuedeVerificar(false);
    if (indice + 1 >= pasos.length) {
      setTerminado(true);
      return;
    }
    setIndice((i) => i + 1);
  }

  function handleResultado(correcto: boolean) {
    if (!pasoActual) return;
    setResultados((prev) => ({ ...prev, [pasoActual.id]: correcto }));
    if (pasoActual.tipo === "vocabulario") avanzar();
  }

  async function handleFinalizar() {
    setGuardado("guardando");
    try {
      await onTerminado(puntaje);
      setGuardado(sesionActiva ? "guardado" : "pendiente");
    } catch {
      setGuardado("error");
    }
  }

  if (terminado) {
    return (
      <div className="bg-[#f8fafc] rounded-2xl p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-6xl font-bold text-[#0A2540] mb-1">{puntaje}%</p>
          <p className="text-sm text-slate-400 mb-2">
            {correctos} de {pasosEvaluables.length} respuestas correctas
          </p>
          <p className="text-lg text-slate-500 mb-8">{mensajePorPuntaje(puntaje)}</p>

          {guardado === "guardado" ? (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#00C4B4]">
              <CheckCircle2 className="w-5 h-5" /> Puntaje guardado en tu progreso
            </p>
          ) : (
            <>
              <button
                onClick={handleFinalizar}
                disabled={guardado === "guardando"}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] disabled:opacity-50 transition-all"
              >
                {guardado === "guardando" && <Loader2 className="w-4 h-4 animate-spin" />}
                {sesionActiva ? "Guardar mi puntaje" : "Crear cuenta y guardar mi puntaje"}
              </button>
              {!sesionActiva && (
                <p className="text-xs text-slate-400 mt-3">
                  Sin cuenta, el puntaje se pierde al salir de la página.
                </p>
              )}
              {guardado === "error" && (
                <p className="text-xs text-red-500 mt-3">
                  No se pudo guardar. Revisá tu conexión e intentá de nuevo.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (!pasoActual) return null;

  return (
    <div className="bg-[#f8fafc] rounded-2xl p-4 md:p-6 pb-24">
      {/* Barra superior: salir + progreso + marcador */}
      <div className="flex items-center gap-3 mb-6">
        {rutaHref && (
          <button
            onClick={() => setConfirmandoSalida(true)}
            aria-label="Salir de la lección"
            className="shrink-0 p-1.5 rounded-full text-slate-400 hover:text-[#0A2540] hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C4B4] transition-all duration-300 ease-out"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
        {/* Marcador en vivo: correctas sobre preguntas ya respondidas */}
        <span className="shrink-0 inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-[#0A2540]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00C4B4]" />
          {correctos}/{evaluadas} · {evaluadas > 0 ? puntaje : 0} pts
        </span>
      </div>

      {renderPasoView(pasoActual, handleResultado, setPuedeVerificar, pasoViewRef)}

      {/* ── Barra de acción inferior fija (vocabulario ya avanza al tocar la tarjeta) ── */}
      {(necesitaVerificarExplicito || respondido) && (
        <div
          className={`sticky bottom-4 mt-6 rounded-2xl border-2 shadow-lg p-4 flex items-center justify-between gap-4 animate-slide-up ${
            !respondido
              ? "bg-white border-slate-200"
              : ultimoResultado
              ? "bg-emerald-50 border-[#00C4B4]"
              : "bg-red-50 border-red-400"
          }`}
        >
          {respondido ? (
            ultimoResultado === true ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="w-5 h-5" /> ¡Correcto! +{puntosPorPregunta} pts
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600">
                <XCircle className="w-5 h-5" /> Incorrecto · +0 pts
              </span>
            )
          ) : (
            <span className="text-sm text-slate-400">
              {necesitaVerificarExplicito ? "Completá tu respuesta" : "Tocá una tarjeta para responder"}
            </span>
          )}

          {respondido ? (
            <button
              onClick={avanzar}
              className="shrink-0 inline-flex items-center px-8 py-3 bg-[#0A2540] text-white rounded-full font-bold hover:bg-[#0d2f4f] transition-all"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={() => pasoViewRef.current?.verificar()}
              disabled={!puedeVerificar}
              className="shrink-0 inline-flex items-center px-8 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Verificar
            </button>
          )}
        </div>
      )}

      {confirmandoSalida && rutaHref && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold text-[#0A2540] mb-2">¿Seguro que querés salir?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Perderás el progreso de esta lección en curso. Lo ya completado antes de hoy sigue
              guardado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmandoSalida(false)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-full py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Seguir aprendiendo
              </button>
              <Link
                href={rutaHref}
                className="flex-1 bg-[#0A2540] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#0d2f4f] transition-colors"
              >
                Salir
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
