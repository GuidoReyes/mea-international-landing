"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { PasoVocabulario } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";
import BotonAudio from "./BotonAudio";

// La tarjeta ENTERA es el botón: tocar en cualquier parte avanza (no hay un
// "Continuar" separado). El audio adentro es su propio <button>, así que este
// contenedor usa role="button" en vez de <button> real (HTML no permite
// anidar botones) y el bloque del audio corta la propagación del click.
export default function PasoVocabularioView({ paso, onResultado }: PasoViewProps<PasoVocabulario>) {
  function continuar() {
    onResultado(true);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={continuar}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          continuar();
        }
      }}
      className="w-full text-left bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col items-center gap-6 text-center cursor-pointer hover:border-[#00C4B4]/40 hover:shadow-md active:scale-[0.99] transition-all"
    >
      {paso.imagenUrl && (
        <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-slate-50">
          <Image src={paso.imagenUrl} alt={paso.palabra} fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold text-[#0A2540]">{paso.palabra}</h2>
          {paso.audioUrl && <BotonAudio audioUrl={paso.audioUrl} />}
        </div>
        <p className="text-lg text-slate-500">{paso.traduccion}</p>
      </div>

      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00C4B4]">
        Tocá la tarjeta para continuar <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}
