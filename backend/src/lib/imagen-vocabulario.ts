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
// Por defecto nunca regenera un concepto que ya está en la librería de R2.
// forzar=true salta el cache-check y sobreescribe la key existente (misma
// URL) — para cuando cambia el estilo de arte y hay que rehacer imágenes
// que ya existían.
export async function resolverImagenVocabulario(
  concepto: string,
  forzar = false
): Promise<ImagenResuelta | undefined> {
  const key = `imagenes/vocabulario/${slugificarConcepto(concepto)}.png`;

  if (!forzar) {
    const existente = await existeArchivoR2(key);
    if (existente) return { url: existente, fuente: "cache" };
  }

  const buffer = await generarImagenGemini(concepto);
  const url = await subirArchivoR2(key, buffer, "image/png");
  if (!url) return undefined;

  // Cache-busting cuando se sobreescribe una key ya existente: la URL en sí
  // no cambia, así que el optimizador de imágenes de Next.js (y el caché del
  // navegador) puede seguir sirviendo los bytes viejos indefinidamente si no
  // se lo forzamos con un query param nuevo.
  const urlFinal = forzar ? `${url}?v=${Date.now()}` : url;

  return { url: urlFinal, fuente: "generada" };
}
