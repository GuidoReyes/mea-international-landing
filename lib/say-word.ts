// Piper (backend/src/lib/piper-tts.ts) es el sistema de audio PRIMARIO: un
// clip pre-generado y verificado por bytes en R2 por paso. Piper nunca
// genera un clip por cada palabra suelta dentro de una frase — solo por el
// texto completo del paso (una palabra corta o una frase). Web Speech API
// (speechSynthesis, nativa del navegador) es el FALLBACK en vivo, usado
// únicamente cuando no hay un clip Piper para el texto pedido — ej. tocar
// una palabra individual dentro de una frase de "opción múltiple" o
// "completar". Son dos mecanismos distintos conviviendo a propósito, no un
// swap de uno por el otro.

let vocesListas = false;

export function primeVoices(): void {
  if (vocesListas || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  vocesListas = true;
  window.speechSynthesis.getVoices();
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Nombres de voces femeninas de buena calidad conocidas por plataforma —
// speechSynthesis.getVoices() no tiene género/calidad como campo, así que
// esto es un match por nombre. Sin esto, .find(v => v.lang.startsWith("en"))
// devolvía la primera voz en inglés que el navegador listara (a veces una
// voz de sistema masculina de baja calidad) — bug real reportado: sonaba
// distinto a la voz Piper "amy" usada en el resto de la lección.
const VOCES_PREFERIDAS = [
  "Samantha", // macOS/iOS Safari + Chrome, en-US femenina, buena calidad
  "Google US English", // Chrome/Android, femenina por default
  "Microsoft Zira", // Windows Edge/Chrome, en-US femenina
  "Microsoft Aria", // Windows Edge, en-US femenina neural
  "Google UK English Female",
  "Karen", // macOS en-AU femenina (fallback si no hay en-US)
  "Moira", // macOS en-IE femenina
];

function elegirVoz(voces: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  for (const nombre of VOCES_PREFERIDAS) {
    const match = voces.find((v) => v.name.includes(nombre) && v.lang.startsWith(lang.slice(0, 2)));
    if (match) return match;
  }
  const femenina = voces.find((v) => v.lang.startsWith(lang.slice(0, 2)) && /female/i.test(v.name));
  if (femenina) return femenina;
  return voces.find((v) => v.lang.startsWith(lang.slice(0, 2)));
}

// Orden de resolución: si hay piperUrl (clip primario ya generado para ESE
// texto exacto), reproducilo. Si no, cae a speechSynthesis en vivo.
export function sayWord(texto: string, piperUrl?: string, lang = "en-US"): void {
  if (piperUrl) {
    new Audio(piperUrl).play().catch(() => {});
    return;
  }

  if (!isSpeechSynthesisSupported()) return;

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = lang;
  utterance.rate = 0.95; // un poco más lento para aprendices

  const voz = elegirVoz(window.speechSynthesis.getVoices(), lang);
  if (voz) utterance.voice = voz;

  window.speechSynthesis.cancel(); // corta lo anterior antes de hablar
  window.speechSynthesis.speak(utterance);
}
