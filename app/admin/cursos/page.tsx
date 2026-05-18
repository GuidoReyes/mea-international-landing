"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type Curso } from "@/lib/api";
import { Plus, Pencil, Trash2, X, BookOpen } from "lucide-react";

const MODALIDADES = ["En línea", "Presencial", "Híbrido"];

interface CursoForm {
  nombre: string;
  descripcion: string;
  precio: string;
  modalidad: string;
  duracion: string;
}

const emptyForm: CursoForm = {
  nombre: "",
  descripcion: "",
  precio: "",
  modalidad: "En línea",
  duracion: "",
};

function CursoModal({
  curso,
  onClose,
  onSaved,
}: {
  curso: Curso | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CursoForm>(
    curso
      ? {
          nombre: curso.nombre,
          descripcion: curso.descripcion,
          precio: String(Number(curso.precio)),
          modalidad: curso.modalidad,
          duracion: curso.duracion,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof CursoForm>(k: K, v: CursoForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número positivo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio,
        modalidad: form.modalidad,
        duracion: form.duracion,
      };
      if (curso) {
        await api.updateCurso(curso.id, data);
      } else {
        await api.createCurso(data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{curso ? "Editar curso" : "Nuevo curso"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del curso</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              placeholder="Ej: Excel Avanzado"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4] focus:ring-1 focus:ring-[#00C4B4]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
            <textarea
              required
              rows={3}
              value={form.descripcion}
              onChange={(e) => setField("descripcion", e.target.value)}
              placeholder="Descripción breve del contenido del curso..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4] focus:ring-1 focus:ring-[#00C4B4]/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio GTQ</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={(e) => setField("precio", e.target.value)}
                placeholder="2500"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4] focus:ring-1 focus:ring-[#00C4B4]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Modalidad</label>
              <select
                value={form.modalidad}
                onChange={(e) => setField("modalidad", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4] focus:ring-1 focus:ring-[#00C4B4]/30"
              >
                {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duración</label>
              <input
                required
                value={form.duracion}
                onChange={(e) => setField("duracion", e.target.value)}
                placeholder="40 horas"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00C4B4] focus:ring-1 focus:ring-[#00C4B4]/30"
              />
            </div>
          </div>
          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2540] text-white text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : curso ? "Guardar cambios" : "Crear curso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CursosPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | Curso | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mea_admin_token")) {
      router.replace("/admin/login");
    }
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCursos();
      setCursos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(curso: Curso) {
    if (!confirm(`¿Desactivar el curso "${curso.nombre}"? Se ocultará pero no se borrará.`)) return;
    setDeleting(curso.id);
    await api.deleteCurso(curso.id);
    setDeleting(null);
    load();
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Cursos</h1>
          <p className="text-slate-400 text-sm mt-1">Catálogo de cursos disponibles</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0A2540] text-white text-sm font-semibold rounded-xl hover:bg-[#0A2540]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo curso
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Modalidad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Duración</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : cursos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">No hay cursos registrados</p>
                    <button
                      onClick={() => setModal("create")}
                      className="text-xs text-[#00C4B4] hover:underline font-semibold"
                    >
                      Crear el primer curso
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              cursos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#0A2540]">{c.nombre}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs">
                    <p className="truncate">{c.descripcion}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-700">
                    Q{Number(c.precio).toLocaleString("es-GT")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {c.modalidad}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{c.duracion}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModal(c)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deleting === c.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <CursoModal
          curso={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
