"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Alumno, type AlumnosResponse, type CreateAlumnoInput } from "@/lib/api";
import { Users, GraduationCap, X, Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function Modal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateAlumnoInput>({
    nombre: "",
    apellido: "",
    email: "",
    whatsapp: "",
    pais: "GT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ carnet: string; tempPassword: string } | null>(null);

  function reset() {
    setForm({ nombre: "", apellido: "", email: "", whatsapp: "", pais: "GT" });
    setError("");
    setCreated(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.createAlumno({
        ...form,
        whatsapp: form.whatsapp || undefined,
      });
      setCreated({ carnet: result.carnet, tempPassword: result.tempPassword });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear alumno");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#0A2540]">Nuevo alumno</h2>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {created ? (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="font-semibold text-[#0A2540] mb-1">Alumno creado</p>
            <p className="text-sm text-slate-400 mb-4">Guarda estas credenciales — no se mostrarán de nuevo.</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Carnet</p>
                <p className="font-mono font-semibold text-[#0A2540]">{created.carnet}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Contraseña temporal</p>
                <p className="font-mono font-semibold text-[#0A2540]">{created.tempPassword}</p>
              </div>
            </div>
            <button onClick={close} className="w-full bg-[#0A2540] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0A2540]/90 transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre *</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
                  placeholder="Ana"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Apellido *</label>
                <input
                  required
                  value={form.apellido}
                  onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
                  placeholder="García"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Correo electrónico *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
                placeholder="ana@correo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">WhatsApp <span className="text-slate-300">(opcional)</span></label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
                placeholder="+502 5555 1234"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={close}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#0A2540] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Crear alumno
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AlumnosPage() {
  const router = useRouter();
  const [data, setData] = useState<AlumnosResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activoFilter, setActivoFilter] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchAlumnos(p: number, s: string, a: boolean | undefined) {
    setLoading(true);
    api
      .getAlumnos(p, s || undefined, a)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAlumnos(page, search, activoFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activoFilter]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchAlumnos(1, value, activoFilter);
    }, 300);
  }

  const total = data?.meta.total ?? 0;
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  const filters = [
    { label: "Todos", value: undefined },
    { label: "Activos", value: true },
    { label: "Inactivos", value: false },
  ];

  return (
    <div className="px-8 py-8">
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchAlumnos(1, search, activoFilter)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Alumnos</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de estudiantes registrados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#0A2540] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0A2540]/90 transition-colors"
        >
          <GraduationCap className="w-4 h-4" />
          Nuevo alumno
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={String(f.value)}
                onClick={() => { setActivoFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activoFilter === f.value
                    ? "bg-[#0A2540] text-white"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar nombre, email, carnet..."
              className="w-56 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
            />
            {!loading && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {total} resultado{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-50">
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Carnet</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Alumno</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Inscripciones</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">
                      {search ? `Sin resultados para "${search}"` : "No hay alumnos registrados"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.data.map((alumno: Alumno) => (
                <tr
                  key={alumno.id}
                  onClick={() => router.push(`/admin/alumnos/${alumno.id}`)}
                  className="hover:bg-slate-50/60 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg group-hover:bg-[#0A2540]/5 transition-colors">
                      {alumno.carnet}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-[#0A2540]">
                    {alumno.apellido}, {alumno.nombre}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{alumno.email}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {alumno.whatsapp ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-300" />
                      {alumno._count?.inscripciones ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(alumno.creadoEn).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
