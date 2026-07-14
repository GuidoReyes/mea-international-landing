"use client";

import Image from "next/image";
import { PasoVocabulario } from "@/lib/leccion-contenido";
import { PasoViewProps } from "./types";
import BotonAudio from "./BotonAudio";

// Sin botón propio: "Continuar" vive en la barra inferior fija del
// LessonPlayer, igual que en el resto de los pasos (misma estructura Duolingo).
export default function PasoVocabularioView({ paso }: PasoViewProps<PasoVocabulario>) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col items-center gap-6 text-center">
      {paso.imagenUrl && (
        <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-slate-50">
          <Image src={paso.imagenUrl} alt={paso.palabra} fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#0A2540]">{paso.palabra}</h2>
          {paso.audioUrl && <BotonAudio audioUrl={paso.audioUrl} />}
        </div>
        <p className="text-lg text-slate-500">{paso.traduccion}</p>
      </div>
    </div>
  );
}
