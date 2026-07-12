// Fetchers server-side para las páginas públicas de planes y checkout.
// (lib/api.ts es el client del admin y depende de localStorage — no sirve en server components.
// El catálogo/detalle de cursos vive en lib/rutas.ts desde que /cursos pasó a ser Ruta-based.)

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
const REVALIDATE_SECONDS = 300;

export interface PlanPrecioPublico {
  id: number;
  duracionMeses: number;
  precioMesCentavos: number;
  precioTotalCentavos: number;
  precioRegularCentavos: number;
  moneda: string;
  ahorroPorcentaje: number;
}

export interface PlanPublico {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  features: string[];
  recomendado: boolean;
  precios: PlanPrecioPublico[];
}

export async function getPlanes(): Promise<PlanPublico[]> {
  try {
    const res = await fetch(`${API_URL}/api/planes`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as PlanPublico[];
  } catch {
    return [];
  }
}

export function formatearPrecioCentavos(centavos: number, moneda: string): string {
  const simbolo = moneda === "USD" ? "$" : "Q";
  const monto = centavos / 100;
  const decimales = Number.isInteger(monto) ? 0 : 2;
  return `${simbolo}${monto.toFixed(decimales)}`;
}

export const WHATSAPP_NUMBER = "50256311728";

export function buildCheckoutWhatsAppUrl(
  planNombre: string,
  duracionMeses: number,
  precioMesFormateado: string
): string {
  const texto = `Hola! Quiero suscribirme al plan ${planNombre} de ${duracionMeses} ${
    duracionMeses === 1 ? "mes" : "meses"
  } (${precioMesFormateado}/mes). ¿Me ayudan a activarlo?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}
