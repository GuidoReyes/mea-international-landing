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

export type PasoLeccion =
  | PasoVocabulario
  | PasoOpcionMultiple
  | PasoCompletar
  | PasoOrdenar
  | PasoEmparejar
  | PasoEscuchar;

export interface LeccionContenido {
  version: 1;
  pasos: PasoLeccion[];
}
