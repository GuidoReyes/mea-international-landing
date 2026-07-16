import { z } from "zod";

// Contenido interactivo de una lección estilo Duolingo — 6 tipos de paso.
// Persistido en Leccion.content (Json). Validado en el endpoint de guardado admin.

const pasoBase = {
  id: z.string().min(1),
  audioUrl: z.string().url().optional(),
};

export const pasoVocabularioSchema = z.object({
  ...pasoBase,
  tipo: z.literal("vocabulario"),
  palabra: z.string().min(1),
  traduccion: z.string().min(1),
  imagenUrl: z.string().url().optional(),
  // Frase corta en inglés que describe la escena a ilustrar (ej. "person
  // waving hello"). La rellena el LLM; se resuelve a imagenUrl generándola
  // con IA (Gemini) y cacheándola en R2 — ver generate-leccion.ts.
  imagenBusqueda: z.string().min(1).optional(),
});

export const pasoOpcionMultipleSchema = z.object({
  ...pasoBase,
  tipo: z.literal("opcion_multiple"),
  pregunta: z.string().min(1),
  opciones: z.array(z.string().min(1)).min(2).max(6),
  respuestaCorrecta: z.number().int().min(0),
});

export const pasoCompletarSchema = z.object({
  ...pasoBase,
  tipo: z.literal("completar"),
  textoAntes: z.string(),
  textoDespues: z.string(),
  respuestaCorrecta: z.string().min(1),
  opciones: z.array(z.string().min(1)).min(2).max(6).optional(),
});

export const pasoOrdenarSchema = z
  .object({
    ...pasoBase,
    tipo: z.literal("ordenar"),
    instruccion: z.string().min(1),
    palabras: z.array(z.string().min(1)).min(2),
    ordenCorrecto: z.array(z.number().int().min(0)),
  })
  // El componente exige colocar TODAS las palabras para habilitar "Verificar"
  // (no hay señuelos/palabras sobrantes en este tipo de ejercicio) — sin este
  // refine, un ordenCorrecto más corto que palabras nunca puede dar correcto.
  .refine(
    (paso) => {
      if (paso.ordenCorrecto.length !== paso.palabras.length) return false;
      const indices = [...paso.ordenCorrecto].sort((a, b) => a - b);
      return indices.every((idx, i) => idx === i);
    },
    {
      message:
        "ordenCorrecto debe ser una permutación de TODOS los índices de palabras (mismo largo, sin señuelos ni índices repetidos/faltantes)",
      path: ["ordenCorrecto"],
    }
  );

export const pasoEmparejarSchema = z.object({
  ...pasoBase,
  tipo: z.literal("emparejar"),
  instruccion: z.string().min(1),
  pares: z.array(z.object({ izquierda: z.string().min(1), derecha: z.string().min(1) })).min(2),
});

export const pasoEscucharSchema = z.object({
  ...pasoBase,
  tipo: z.literal("escuchar"),
  audioUrl: z.string().url(),
  opciones: z.array(z.string().min(1)).min(2).max(6),
  respuestaCorrecta: z.number().int().min(0),
});

export const pasoLeccionSchema = z.discriminatedUnion("tipo", [
  pasoVocabularioSchema,
  pasoOpcionMultipleSchema,
  pasoCompletarSchema,
  pasoOrdenarSchema,
  pasoEmparejarSchema,
  pasoEscucharSchema,
]);

export const leccionContenidoSchema = z.object({
  version: z.literal(1),
  pasos: z.array(pasoLeccionSchema).min(1),
});

export type PasoLeccion = z.infer<typeof pasoLeccionSchema>;
export type LeccionContenido = z.infer<typeof leccionContenidoSchema>;
