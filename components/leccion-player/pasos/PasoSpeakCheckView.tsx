"use client";

import { useState } from "react";
import { Mic, CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { PasoSpeakCheck } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";
import { sayWord } from "@/lib/say-word";
import { recognizeOnce, esRespuestaAceptable, isSpeechRecognitionSupported } from "@/lib/recognize-speech";

type Estado = "idle" | "escuchando" | "correcto" | "incorrecto" | "error";

// Alcance honesto: verifica SI el alumno dijo la palabra (con tolerancia de
// acento), no da un puntaje fonético fino. Sin soporte de micrófono/permiso,
// degrada con gracia (no bloquea el avance de la lección).
export default function PasoSpeakCheckView({ paso, onResultado }: PasoViewProps<PasoSpeakCheck>) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [transcript, setTranscript] = useState("");
  const soportado = isSpeechRecognitionSupported();

  async function escuchar() {
    setEstado("escuchando");
    try {
      const resultado = await recognizeOnce(paso.lang ?? "en-US");
      setTranscript(resultado);
      const acierto = esRespuestaAceptable(resultado, paso.target);
      setEstado(acierto ? "correcto" : "incorrecto");
      if (acierto) onResultado(true);
    } catch {
      setEstado("error");
    }
  }

  function reintentar() {
    setEstado("idle");
    setTranscript("");
  }

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col items-center gap-6 text-center transition-colors ${
        estado === "correcto" ? "border-[#00C4B4] animate-pop-correct" : estado === "incorrecto" ? "border-red-400 animate-shake" : "border-slate-100"
      }`}
    >
      <p className="text-sm font-semibold text-slate-400">Decí esta palabra en voz alta</p>

      <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold text-[#0A2540]">{paso.target}</h2>
        <button
          type="button"
          onClick={() => sayWord(paso.target, paso.audioUrl, paso.lang ?? "en-US")}
          aria-label="Escuchar pronunciación modelo"
          className="inline-flex items-center justify-center rounded-full bg-[#00C4B4]/10 text-[#00C4B4] hover:bg-[#00C4B4]/20 transition-colors p-3"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {!soportado ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">
            Tu navegador no soporta reconocimiento de voz. Probá con Chrome o Edge para practicar la
            pronunciación.
          </p>
          <button
            type="button"
            onClick={() => onResultado(true)}
            className="inline-flex items-center px-6 py-2.5 rounded-full border-2 border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition-all"
          >
            Continuar sin verificar
          </button>
        </div>
      ) : estado === "correcto" ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="w-5 h-5" /> ¡Bien dicho!
        </p>
      ) : estado === "incorrecto" ? (
        <div className="flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600">
            <XCircle className="w-5 h-5" /> Casi — escuchamos &quot;{transcript}&quot;
          </p>
          <button
            type="button"
            onClick={reintentar}
            className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#00C4B4] text-white font-semibold hover:bg-[#00a898] transition-all"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : estado === "error" ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">
            No pudimos acceder al micrófono. Revisá el permiso del navegador e intentá de nuevo.
          </p>
          <button
            type="button"
            onClick={reintentar}
            className="inline-flex items-center px-6 py-2.5 rounded-full border-2 border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition-all"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={escuchar}
          disabled={estado === "escuchando"}
          aria-label="Grabar mi pronunciación"
          className={`flex items-center justify-center w-20 h-20 rounded-full bg-[#00C4B4] text-white shadow-md hover:bg-[#00C4B4]/90 active:scale-95 transition-all ${
            estado === "escuchando" ? "animate-pulse" : ""
          }`}
        >
          <Mic className="w-8 h-8" />
        </button>
      )}

      <p className="text-xs text-slate-400">Requiere micrófono e internet</p>
    </div>
  );
}
