"use client";

import { Volume2 } from "lucide-react";
import { sayWord } from "@/lib/say-word";

interface FraseConAudioProps {
  texto: string;
  // Clip Piper ya generado para ESTE texto exacto (primario). Si no viene,
  // el botón de frase completa también cae a Web Speech (todavía no hay
  // audio Piper pre-generado para este tipo de paso).
  piperUrl?: string;
  lang?: string;
  className?: string;
  // false cuando "texto" es solo un FRAGMENTO de una frase más grande (ej.
  // el textoAntes/textoDespues de un "completar" con espacio en blanco) —
  // ahí no tiene sentido un botón "escuchar frase completa" del fragmento.
  mostrarBotonFrase?: boolean;
}

// Tocar una palabra suelta dentro de la frase la repite sola (Web Speech,
// no hay clips Piper por palabra individual). El botón 🔊 aparte dice la
// frase completa (Piper si existe, si no Web Speech).
export default function FraseConAudio({
  texto,
  piperUrl,
  lang = "en-US",
  className = "",
  mostrarBotonFrase = true,
}: FraseConAudioProps) {
  const tokens = texto.split(/(\s+)/);

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 ${className}`}>
      <span>
        {tokens.map((token, i) => {
          if (token.trim() === "") return <span key={i}>{token}</span>;
          const palabraLimpia = token.replace(/[.,!?;:]/g, "");
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => sayWord(palabraLimpia, undefined, lang)}
              onMouseEnter={() => {
                // Refuerzo solo en desktop real (mouse fino) — en touch,
                // "mouseenter" puede dispararse junto con el tap y duplicar
                // el audio, así que ahí el tap solo (onClick) alcanza.
                if (typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                  sayWord(palabraLimpia, undefined, lang);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  sayWord(palabraLimpia, undefined, lang);
                }
              }}
              className="cursor-pointer rounded hover:text-[#00C4B4] hover:underline underline-offset-2 transition-colors"
            >
              {token}
            </span>
          );
        })}
      </span>
      {mostrarBotonFrase && (
        <button
          type="button"
          onClick={() => sayWord(texto, piperUrl, lang)}
          aria-label="Escuchar frase completa"
          className="inline-flex items-center justify-center rounded-full bg-[#00C4B4]/10 text-[#00C4B4] hover:bg-[#00C4B4]/20 transition-colors p-1.5 shrink-0"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      )}
    </span>
  );
}
