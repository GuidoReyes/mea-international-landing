"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";

interface BotonAudioProps {
  audioUrl: string;
  className?: string;
}

export default function BotonAudio({ audioUrl, className = "" }: BotonAudioProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  function reproducir() {
    // Recrear el Audio si la URL cambió: el objeto cacheado del paso anterior
    // seguiría sonando aunque la prop ya apunte a otro archivo.
    if (!audioRef.current || urlRef.current !== audioUrl) {
      audioRef.current?.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      urlRef.current = audioUrl;
    }
    setPlaying(true);
    audioRef.current.currentTime = 0;
    void audioRef.current.play().finally(() => {
      if (audioRef.current?.paused) setPlaying(false);
    });
  }

  return (
    <button
      type="button"
      onClick={reproducir}
      aria-label="Reproducir audio"
      className={`inline-flex items-center justify-center rounded-full bg-[#00C4B4]/10 text-[#00C4B4] hover:bg-[#00C4B4]/20 transition-colors p-3 ${
        playing ? "animate-pulse" : ""
      } ${className}`}
    >
      <Volume2 className="w-5 h-5" />
    </button>
  );
}
