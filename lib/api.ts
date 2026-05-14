const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mea_admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("mea_admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("mea_admin_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/admin/login";
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface Admin {
  id: number;
  email: string;
  nombre: string;
  rol: string;
}

export interface Lead {
  id: number;
  telefono: string;
  nombre: string | null;
  email: string | null;
  interes: string | null;
  estado: string;
  creadoEn: string;
  actualizadoEn: string;
  _count?: { conversaciones: number };
}

export interface Mensaje {
  id: number;
  rol: "user" | "assistant";
  contenido: string;
  creadoEn: string;
}

export interface Conversacion {
  id: number;
  estado: string;
  creadoEn: string;
  mensajes: Mensaje[];
}

export interface LeadDetalle extends Lead {
  conversaciones: Conversacion[];
}

export interface LeadsResponse {
  data: Lead[];
  meta: { total: number; page: number; limit: number };
}

export interface Alumno {
  id: number;
  carnet: string;
  nombre: string;
  apellido: string;
  email: string;
  whatsapp: string | null;
  pais: string;
  activo: boolean;
  creadoEn: string;
  _count?: { inscripciones: number };
}

export interface AlumnosResponse {
  data: Alumno[];
  meta: { total: number; page: number; limit: number };
}

export interface Inscripcion {
  id: number;
  estado: string;
  creadoEn: string;
  edicion: {
    id: number;
    nombre: string;
    precio: string;
    curso: { nombre: string };
  };
  pagos: Pago[];
}

export interface Pago {
  id: number;
  monto: string;
  montoUSD: string | null;
  moneda: string;
  metodo: string;
  estado: string;
  referencia: string | null;
  creadoEn: string;
}

export interface AlumnoDetalle extends Alumno {
  inscripciones: Inscripcion[];
}

export interface Edicion {
  id: number;
  nombre: string;
  precio: string;
  precioUSD: string | null;
  activo: boolean;
  curso: { nombre: string };
}

export interface CreateAlumnoInput {
  nombre: string;
  apellido: string;
  email: string;
  whatsapp?: string;
  pais?: string;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; admin: Admin }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getLeads: (page = 1, estado?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (estado) params.set("estado", estado);
    return apiFetch<LeadsResponse>(`/api/leads?${params}`);
  },

  getLead: (id: number) => apiFetch<LeadDetalle>(`/api/leads/${id}`),

  patchLead: (id: number, data: Partial<Pick<Lead, "nombre" | "email" | "interes" | "estado">>) =>
    apiFetch<Lead>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getAlumnos: (page = 1, search?: string, activo?: boolean) => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    if (activo !== undefined) params.set("activo", String(activo));
    return apiFetch<AlumnosResponse>(`/api/alumnos?${params}`);
  },

  createAlumno: (data: CreateAlumnoInput) =>
    apiFetch<Alumno & { tempPassword: string }>("/api/alumnos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAlumno: (id: number) => apiFetch<AlumnoDetalle>(`/api/alumnos/${id}`),

  getEdiciones: () =>
    apiFetch<{ data: Edicion[] }>("/api/ediciones?activo=true&limit=100"),

  createInscripcion: (alumnoId: number, edicionId: number) =>
    apiFetch<Inscripcion>("/api/inscripciones", {
      method: "POST",
      body: JSON.stringify({ alumnoId, edicionId }),
    }),
};
