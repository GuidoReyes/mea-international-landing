import { existeArchivoR2, subirArchivoR2 } from "./storage";
import { generarImagenGemini } from "./gemini-image";

// Slug determinístico para la key de R2 — misma frase de búsqueda siempre
// resuelve a la misma key, lo que permite el cache-o-genera de abajo.
export function slugificarConcepto(concepto: string): string {
  return concepto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type FuenteImagen = "cache" | "generada";

export interface ImagenResuelta {
  url: string;
  fuente: FuenteImagen;
}

// Punto único de verdad para "¿ya existe una imagen para este concepto, o
// hay que generarla?" — usado tanto por generate-leccion.ts (una lección a
// la vez) como por generar-imagenes-faltantes.ts (lote sobre toda la BD).
// Nunca regenera un concepto que ya está en la librería de R2.
export async function resolverImagenVocabulario(concepto: string): Promise<ImagenResuelta | undefined> {
  const key = `imagenes/vocabulario/${slugificarConcepto(concepto)}.png`;

  const existente = await existeArchivoR2(key);
  if (existente) return { url: existente, fuente: "cache" };

  const buffer = await generarImagenGemini(concepto);
  const url = await subirArchivoR2(key, buffer, "image/png");
  if (!url) return undefined;

  return { url, fuente: "generada" };
}
