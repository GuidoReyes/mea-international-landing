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

  const vozIngles = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
  if (vozIngles) utterance.voice = vozIngles;

  window.speechSynthesis.cancel(); // corta lo anterior antes de hablar
  window.speechSynthesis.speak(utterance);
}
