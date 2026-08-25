// Client API del portal de alumno — token separado del admin (lib/api.ts).

import type { RutaCurriculum } from "./rutas";
import type { LeccionContenido } from "./leccion-contenido";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
const TOKEN_KEY = "mea_alumno_token";

export function getAlumnoToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAlumnoToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAlumnoToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function alumnoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAlumnoToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAlumnoToken();
    throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface Alumno {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  carnet: string;
}

export interface MiCursoProgreso {
  cursoOnlineId: number;
  slug: string;
  rutaSlug: string;
  titulo: string;
  nivel: string;
  track: string;
  iniciadaEn: string;
  totalLecciones: number;
  leccionesCompletadas: number;
  porcentaje: number;
  certificado: { codigo: string; urlPdf: string | null } | null;
}

export interface SuscripcionMe {
  suscripcion: {
    id: number;
    estado: string;
    proveedor: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    plan: { nombre: string; slug: string };
    duracionMeses: number;
  } | null;
  activa: boolean;
}

export interface ResultadoCompletar {
  progreso: { leccionId: number; completada: boolean; puntaje: number | null };
  certificado: { codigo: string; puntaje: number; urlPdf: string | null } | null;
}

export interface CuentaDeposito {
  banco: string;
  nombreCuenta: string;
  tipoCuenta: string;
  numeroCuenta: string;
}

export interface CheckoutManualResult {
  suscripcionId: number;
  pagoId?: number;
  cuenta?: CuentaDeposito;
}

export const alumnoApi = {
  login: (email: string, password: string) =>
    alumnoFetch<{ token: string; primerLogin: boolean; alumno: Alumno }>(
      "/api/auth/alumno/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  registro: (data: { nombre: string; apellido?: string; email: string; password: string }) =>
    alumnoFetch<{ token: string; primerLogin: boolean; alumno: Alumno }>(
      "/api/auth/alumno/registro",
      { method: "POST", body: JSON.stringify(data) }
    ),

  otpSolicitar: (whatsapp: string) =>
    alumnoFetch<{ ok: boolean; mensaje: string }>("/api/auth/alumno/otp/solicitar", {
      method: "POST",
      body: JSON.stringify({ whatsapp }),
    }),

  otpVerificar: (whatsapp: string, codigo: string, nombre?: string) =>
    alumnoFetch<{ token: string; esNuevo: boolean; primerLogin: boolean; alumno: Alumno }>(
      "/api/auth/alumno/otp/verificar",
      { method: "POST", body: JSON.stringify({ whatsapp, codigo, nombre }) }
    ),

  cambiarPassword: (passwordActual: string, passwordNueva: string) =>
    alumnoFetch<{ message: string }>("/api/auth/alumno/cambiar-password", {
      method: "POST",
      body: JSON.stringify({ passwordActual, passwordNueva }),
    }),

  getMe: () => alumnoFetch<Alumno & { primerLogin: boolean }>("/api/auth/alumno/me"),

  // Curriculum de una Ruta con progreso/desbloqueo — misma ruta pública, con token del alumno
  getRuta: (slug: string) =>
    alumnoFetch<RutaCurriculum>(`/api/rutas/${encodeURIComponent(slug)}/curriculum`),

  getLeccionJugar: (leccionId: number) =>
    alumnoFetch<{ id: number; titulo: string; contenido: LeccionContenido }>(
      `/api/lecciones/${leccionId}/jugar`
    ),

  reportarErrorLeccion: (leccionId: number, mensaje: string) =>
    alumnoFetch<{ id: number }>(`/api/lecciones/${leccionId}/reportar-error`, {
      method: "POST",
      body: JSON.stringify({ mensaje }),
    }),

  completarLeccion: (leccionId: number, puntaje?: number) =>
    alumnoFetch<ResultadoCompletar>(`/api/lecciones/${leccionId}/completar`, {
      method: "POST",
      body: JSON.stringify(puntaje !== undefined ? { puntaje } : {}),
    }),

  getMisCursos: () => alumnoFetch<MiCursoProgreso[]>("/api/cursos-online/mis/progreso"),

  getSuscripcion: () => alumnoFetch<SuscripcionMe>("/api/suscripciones/me"),

  entrarClaseEnVivo: (grupoId: number) =>
    alumnoFetch<{ zoomUrl: string }>(`/api/clases-en-vivo/${grupoId}/entrar`),

  checkout: (planPrecioId: number) =>
    alumnoFetch<{ checkoutUrl: string; suscripcionId: number }>("/api/suscripciones/checkout", {
      method: "POST",
      body: JSON.stringify({ planPrecioId }),
    }),

  checkoutManual: (planPrecioId: number, via?: "deposito" | "whatsapp") =>
    alumnoFetch<CheckoutManualResult>("/api/suscripciones/checkout-manual", {
      method: "POST",
      body: JSON.stringify({ planPrecioId, via }),
    }),

  subirComprobante: async (pagoId: number, file: File, mesPagado: string) => {
    const token = getAlumnoToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mesPagado", mesPagado);

    const res = await fetch(`${API_URL}/api/suscripciones/pagos/${pagoId}/comprobante`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (res.status === 401) {
      clearAlumnoToken();
      throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<{ ok: boolean; comprobanteUrl: string }>;
  },
};
