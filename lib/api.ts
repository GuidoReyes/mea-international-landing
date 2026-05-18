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

export interface CRMEtapa {
  id: number;
  nombre: string;
  orden: number;
  color: string;
}

export interface CRMLead {
  id: number;
  nombre: string | null;
  telefono: string;
  email: string | null;
  etapaId: number | null;
  valorEstimado: string | null;
  fechaCierreEstimada: string | null;
  notasCRM: string | null;
  asignadoAdminId: number | null;
  asignadoAdmin: { id: number; nombre: string } | null;
  creadoEn: string;
}

export type PipelineColumn = CRMEtapa & { leads: CRMLead[] };

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

export interface Curso {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  modalidad: string;
  duracion: string;
  activo: boolean;
}

export interface Edicion {
  id: number;
  cursoId: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  precio: string;
  precioUSD: string | null;
  cupo: number;
  activo: boolean;
  instructor: string | null;
  curso: { id: number; nombre: string };
  _count?: { inscripciones: number };
}

export interface CreateAlumnoInput {
  nombre: string;
  apellido: string;
  email: string;
  whatsapp?: string;
  pais?: string;
}

export interface ReportesLeads {
  periodo: string;
  totalLeads: number;
  porEstado: Record<string, number>;
  porEtapa: { etapaId: number; nombre: string; count: number; valorTotal: number }[];
  evolucion: { fecha: string; total: number }[];
  tasaConversion: number;
  tiempoPromedioCierre: number | null;
}

export interface ReportesResumen {
  totalLeads: number;
  nuevosUltimos30dias: number;
  nuevosUltimos7dias: number;
  inscripcionesActivas: number;
  ingresosMes: number;
}

export interface PLMes {
  mes: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

export interface Proyeccion {
  mes: string;
  proyectado: number;
}

export interface FlujoCaja {
  saldoActual: number;
  ingresoProyectado30dias: number;
  egresoProyectado30dias: number;
  flujoPROyectado30dias: number;
}

export interface Egreso {
  id: number;
  concepto: string;
  monto: string;
  moneda: string;
  categoria: string;
  fecha: string;
  nota: string | null;
  creadoEn: string;
}

export interface EgresosResponse {
  data: Egreso[];
  meta: { total: number; page: number; limit: number };
}

export interface Reconciliacion {
  metodo: string;
  totalGTQ: number;
  totalUSD: number;
}

export interface Campana {
  id: number;
  nombre: string;
  template: string;
  variables: string[];
  estado: "BORRADOR" | "ENVIANDO" | "COMPLETADA";
  totalDestinatarios: number;
  enviados: number;
  errores: number;
  creadoEn: string;
  _count?: { destinatarios: number };
}

export interface CampanaStatus {
  estado: string;
  totalDestinatarios: number;
  enviados: number;
  errores: number;
  progreso: number;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; admin: Admin }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => apiFetch<Admin & { activo: boolean }>("/api/auth/me"),

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

  getPipeline: () => apiFetch<PipelineColumn[]>("/api/crm/pipeline"),

  patchLeadEtapa: (leadId: number, etapaId: number) =>
    apiFetch<CRMLead>(`/api/crm/leads/${leadId}/etapa`, {
      method: "PATCH",
      body: JSON.stringify({ etapaId }),
    }),

  patchCRMLead: (leadId: number, data: Partial<Pick<CRMLead, "notasCRM" | "asignadoAdminId" | "valorEstimado" | "fechaCierreEstimada">>) =>
    apiFetch<CRMLead>(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getCRMEtapas: () => apiFetch<CRMEtapa[]>("/api/crm/etapas"),

  getReportesLeads: (periodo: "7d" | "30d" | "90d" = "30d") =>
    apiFetch<ReportesLeads>(`/api/reportes/leads?periodo=${periodo}`),

  getReportesResumen: () => apiFetch<ReportesResumen>("/api/reportes/resumen"),

  getCursos: () =>
    apiFetch<Curso[]>("/api/cursos?limit=100"),

  getEdiciones: (cursoId?: number, activo?: boolean) => {
    const params = new URLSearchParams({ limit: "200" });
    if (cursoId) params.set("cursoId", String(cursoId));
    if (activo !== undefined) params.set("activo", String(activo));
    return apiFetch<{ data: Edicion[] }>(`/api/ediciones?${params}`);
  },

  createEdicion: (data: {
    cursoId: number; nombre: string; fechaInicio: string; fechaFin: string;
    precio: number; precioUSD?: number; cupo: number; instructor?: string;
  }) => apiFetch<Edicion>("/api/ediciones", { method: "POST", body: JSON.stringify(data) }),

  createInscripcion: (alumnoId: number, edicionId: number) =>
    apiFetch<Inscripcion>("/api/inscripciones", {
      method: "POST",
      body: JSON.stringify({ alumnoId, edicionId }),
    }),

  getPL: () => apiFetch<PLMes[]>("/api/reportes/pl"),

  getProyecciones: () => apiFetch<Proyeccion[]>("/api/reportes/proyecciones"),

  getFlujoCaja: () => apiFetch<FlujoCaja>("/api/reportes/flujo-caja"),

  getEgresos: (page = 1, categoria?: string, mes?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (categoria) params.set("categoria", categoria);
    if (mes) params.set("mes", mes);
    return apiFetch<EgresosResponse>(`/api/finanzas/egresos?${params}`);
  },

  createEgreso: (data: { concepto: string; monto: number; moneda: string; categoria: string; fecha: string; nota?: string }) =>
    apiFetch<Egreso>("/api/finanzas/egresos", { method: "POST", body: JSON.stringify(data) }),

  updateEgreso: (id: number, data: Partial<{ concepto: string; monto: number; moneda: string; categoria: string; fecha: string; nota: string }>) =>
    apiFetch<Egreso>(`/api/finanzas/egresos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteEgreso: (id: number) =>
    fetch(`${API_URL}/api/finanzas/egresos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  getReconciliacion: (mes?: string) => {
    const params = mes ? `?mes=${mes}` : "";
    return apiFetch<Reconciliacion[]>(`/api/finanzas/reconciliacion${params}`);
  },

  getCampanas: () => apiFetch<Campana[]>("/api/marketing/campanas"),

  createCampana: (data: { nombre: string; template: string }) =>
    apiFetch<Campana>("/api/marketing/campanas", { method: "POST", body: JSON.stringify(data) }),

  enviarCampana: (id: number, leadIds: number[]) =>
    apiFetch<{ message: string; total: number }>(`/api/marketing/campanas/${id}/enviar`, {
      method: "POST",
      body: JSON.stringify({ leadIds }),
    }),

  getCampanaStatus: (id: number) =>
    apiFetch<CampanaStatus>(`/api/marketing/campanas/${id}/status`),
};
