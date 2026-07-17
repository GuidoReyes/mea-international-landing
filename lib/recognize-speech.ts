// Reconocimiento de voz con la Web Speech API nativa del navegador (gratis,
// sin backend). Mejor soporte en Chrome/Edge/Android; puede no existir en
// otros navegadores (ej. Firefox) — por eso isSpeechRecognitionSupported()
// se usa para degradar con gracia en vez de romper la UI.
// Verifica SI el alumno dijo la palabra/frase (con tolerancia de acento),
// no da un puntaje fonético fino — eso requeriría un servicio dedicado.

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: SpeechRecognitionResultLike } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function obtenerConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return !!obtenerConstructor();
}

export function recognizeOnce(lang = "en-US"): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognitionCtor = obtenerConstructor();
    if (!SpeechRecognitionCtor) {
      reject(new Error("unsupported"));
      return;
    }

    const recognizer = new SpeechRecognitionCtor();
    recognizer.lang = lang;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 3;
    recognizer.onresult = (event) => resolve(event.results[0]![0]!.transcript);
    recognizer.onerror = (event) => reject(new Error(event.error));
    recognizer.start();
  });
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:¿¡]/g, "");
}

// Distancia de Levenshtein — tolerancia de acento sin castigar pronunciación
// razonable (ej. "watter" vs "water" sigue contando como acertado).
function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, (_, i) => [i, ...Array(columnas - 1).fill(0)]);
  for (let j = 0; j < columnas; j++) matriz[0]![j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i]![j] = Math.min(
        matriz[i - 1]![j]! + 1,
        matriz[i]![j - 1]! + 1,
        matriz[i - 1]![j - 1]! + costo
      );
    }
  }
  return matriz[filas - 1]![columnas - 1]!;
}

// Acepta coincidencia exacta o "suficientemente parecida" (distancia <= 20%
// del largo del target, mínimo 1) — no castiga variaciones menores de acento.
export function esRespuestaAceptable(transcript: string, target: string): boolean {
  const t = normalizar(transcript);
  const objetivo = normalizar(target);
  if (t === objetivo) return true;

  const umbral = Math.max(1, Math.round(objetivo.length * 0.2));
  return distanciaLevenshtein(t, objetivo) <= umbral;
}
