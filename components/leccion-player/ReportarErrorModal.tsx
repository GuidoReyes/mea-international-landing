"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { alumnoApi } from "@/lib/alumno-api";

interface ReportarErrorModalProps {
  leccionId: number;
  onClose: () => void;
}

const MENSAJE_MAX = 1000;

export default function ReportarErrorModal({ leccionId, onClose }: ReportarErrorModalProps) {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await alumnoApi.reportarErrorLeccion(leccionId, mensaje.trim());
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el reporte. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0A2540]">¿Algo funciona mal en esta lección?</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {enviado ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-[#00C4B4] mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              ¡Gracias! Le avisamos al equipo de MEA para que lo revise.
            </p>
            <button
              onClick={onClose}
              className="mt-4 inline-flex items-center px-6 py-2.5 rounded-full bg-[#00C4B4] text-white font-semibold hover:bg-[#00a898] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-3">
            <p className="text-sm text-slate-500">
              Contanos qué viste mal (un audio que no suena, una imagen rota, un ejercicio que no
              deja continuar, etc.).
            </p>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value.slice(0, MENSAJE_MAX))}
              rows={4}
              placeholder="Ej: el audio de la palabra 'mute' no reproduce nada."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#00C4B4]"
              autoFocus
            />
            <p className="text-xs text-slate-400 text-right">{mensaje.length}/{MENSAJE_MAX}</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={enviando || !mensaje.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#00C4B4] text-white font-bold hover:bg-[#00a898] disabled:opacity-50 transition-all"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviando ? "Enviando..." : "Enviar reporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
