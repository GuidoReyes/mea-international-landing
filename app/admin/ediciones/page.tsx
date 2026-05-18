"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Edicion, type Curso } from "@/lib/api";
import { getToken } from "@/lib/api";
import { BookOpen, Plus, X, Calendar, Users, DollarSign } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function BadgeActivo({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
      activo ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-emerald-400" : "bg-slate-300"}`} />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

interface ModalProps {
  cursos: Curso[];
  onClose: () => void;
  onCreated: () => void;
}

function NuevaEdicionModal({ cursos, onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState({
    cursoId: cursos[0]?.id ?? 0,
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    precio: "",
    precioUSD: "",
    cupo: "20",
    instructor: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createEdicion({
        cursoId: Number(form.cursoId),
        nombre: form.nombre,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        precio: parseFloat(form.precio),
        precioUSD: form.precioUSD ? parseFloat(form.precioUSD) : undefined,
        cupo: parseInt(form.cupo),
        instructor: form.instructor || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Nueva edición</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso</label>
            <select value={form.cursoId} onChange={(e) => set("cursoId", e.target.value)} required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]">
              {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de la edición</label>
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required placeholder="Ej: Enero 2026"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio GTQ</label>
              <input type="number" value={form.precio} onChange={(e) => set("precio", e.target.value)} required min="0" step="0.01" placeholder="2500"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio USD</label>
              <input type="number" value={form.precioUSD} onChange={(e) => set("precioUSD", e.target.value)} min="0" step="0.01" placeholder="320"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cupo</label>
              <input type="number" value={form.cupo} onChange={(e) => set("cupo", e.target.value)} required min="1" placeholder="20"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Instructor <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
            <input value={form.instructor} onChange={(e) => set("instructor", e.target.value)} placeholder="Nombre del instructor"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4]" />
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2540] text-white text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-50 transition-colors">
              {loading ? "Creando..." : "Crear edición"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EdicionesPage() {
  const router = useRouter();
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoFilter, setCursoFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push("/admin/login"); return; }
    api.getCursos().then((data) => setCursos(data)).catch(() => {});
  }, [router]);

  function load() {
    setLoading(true);
    api.getEdiciones(cursoFilter || undefined)
      .then((r) => setEdiciones(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [cursoFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group by curso
  const grupos = ediciones.reduce<Record<number, { curso: { id: number; nombre: string }; items: Edicion[] }>>((acc, e) => {
    if (!acc[e.cursoId]) acc[e.cursoId] = { curso: e.curso, items: [] };
    acc[e.cursoId].items.push(e);
    return acc;
  }, {});

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Ediciones</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de ediciones por curso</p>
        </div>
        <button onClick={() => setShowModal(true)} disabled={cursos.length === 0}
          title={cursos.length === 0 ? "Primero crea un curso en /api/cursos" : undefined}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0A2540] text-white text-sm font-semibold rounded-xl hover:bg-[#0A2540]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus className="w-4 h-4" />
          Nueva edición
        </button>
      </div>

      {/* Filtro por curso */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setCursoFilter("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cursoFilter === "" ? "bg-[#0A2540] text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
          Todos
        </button>
        {cursos.map((c) => (
          <button key={c.id} onClick={() => setCursoFilter(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cursoFilter === c.id ? "bg-[#0A2540] text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Grupos */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50"><Skeleton className="h-5 w-40" /></div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="px-6 py-4 flex gap-4 border-b border-slate-50 last:border-0">
                  <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : Object.keys(grupos).length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm">No hay ediciones{cursoFilter ? " para este curso" : ""}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(grupos).map(({ curso, items }) => (
            <div key={curso.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00C4B4]" />
                <h2 className="text-sm font-bold text-[#0A2540]">{curso.nombre}</h2>
                <span className="ml-auto text-xs text-slate-400">{items.length} edición{items.length !== 1 ? "es" : ""}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-50">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fechas</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Inscritos</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0A2540]">{e.nombre}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {fmt(e.fechaInicio)} — {fmt(e.fechaFin)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="w-3 h-3 text-slate-300" />
                          <span className="font-semibold text-slate-700">Q{Number(e.precio).toLocaleString()}</span>
                          {e.precioUSD && <span className="text-slate-400 ml-1">${Number(e.precioUSD).toLocaleString()}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5 text-slate-300" />
                          <span className={`font-semibold ${(e._count?.inscripciones ?? 0) >= e.cupo ? "text-red-500" : "text-slate-700"}`}>
                            {e._count?.inscripciones ?? 0}
                          </span>
                          <span className="text-slate-300">/ {e.cupo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{e.instructor ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4"><BadgeActivo activo={e.activo} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NuevaEdicionModal
          cursos={cursos}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
