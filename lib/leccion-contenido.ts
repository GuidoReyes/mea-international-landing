// Tipos frontend del contenido interactivo de una lección estilo Duolingo — 6 tipos de paso.
// Espejo puro de backend/src/lib/leccion-contenido.schema.ts (sin zod, el frontend no valida).

interface PasoBase {
  id: string;
  audioUrl?: string;
}

export interface PasoVocabulario extends PasoBase {
  tipo: "vocabulario";
  palabra: string;
  traduccion: string;
  imagenUrl?: string;
}

export interface PasoOpcionMultiple extends PasoBase {
  tipo: "opcion_multiple";
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export interface PasoCompletar extends PasoBase {
  tipo: "completar";
  textoAntes: string;
  textoDespues: string;
  respuestaCorrecta: string;
  opciones?: string[];
}

export interface PasoOrdenar extends PasoBase {
  tipo: "ordenar";
  instruccion: string;
  palabras: string[];
  ordenCorrecto: number[];
  fraseCorrecta: string;
}

export interface PasoEmparejarPar {
  izquierda: string;
  derecha: string;
}

export interface PasoEmparejar extends PasoBase {
  tipo: "emparejar";
  instruccion: string;
  pares: PasoEmparejarPar[];
}

export interface PasoEscuchar extends PasoBase {
  tipo: "escuchar";
  audioUrl: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export interface PasoSpeakCheck extends PasoBase {
  tipo: "speak-check";
  target: string;
  lang?: string;
  imagenUrl?: string;
}

export type PasoLeccion =
  | PasoVocabulario
  | PasoOpcionMultiple
  | PasoCompletar
  | PasoOrdenar
  | PasoEmparejar
  | PasoEscuchar
  | PasoSpeakCheck;

export interface LeccionContenido {
  version: 1;
  pasos: PasoLeccion[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
const REVALIDATE_SECONDS = 300;

// Solo debe llamarse para lecciones con esGratis=true: el backend
// (backend/src/routes/lecciones.ts, GET /:id/jugar) sirve este contenido sin
// autenticación únicamente en ese caso.
export async function getLeccionContenidoPublico(leccionId: number): Promise<LeccionContenido | null> {
  try {
    const res = await fetch(`${API_URL}/api/lecciones/${leccionId}/jugar`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { contenido: LeccionContenido };
    return data.contenido;
  } catch {
    return null;
  }
}

// Extrae líneas de texto real (no inventado) desde los pasos interactivos,
// para renderizar un resumen indexable server-side antes de que monte el
// reproductor interactivo del lado del cliente.
export function resumenLegiblePasos(pasos: PasoLeccion[], limite = 6): string[] {
  const lineas: string[] = [];
  for (const paso of pasos) {
    if (lineas.length >= limite) break;
    switch (paso.tipo) {
      case "vocabulario":
        lineas.push(`${paso.palabra} — ${paso.traduccion}`);
        break;
      case "opcion_multiple":
        lineas.push(paso.pregunta);
        break;
      case "completar":
        lineas.push(`${paso.textoAntes} ___ ${paso.textoDespues}`.trim());
        break;
      case "ordenar":
        lineas.push(paso.fraseCorrecta);
        break;
      case "emparejar":
        lineas.push(paso.instruccion);
        break;
      case "escuchar":
        lineas.push(paso.opciones.join(" / "));
        break;
      case "speak-check":
        lineas.push(paso.target);
        break;
    }
  }
  return lineas;
}
