"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type Egreso, type Reconciliacion } from "@/lib/api";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIAS = ["SALARIO", "COMISION", "OPERATIVO", "MARKETING"] as const;
type Categoria = (typeof CATEGORIAS)[number];

function fmt(n: number) {
  return n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function categoriaBadge(cat: string) {
  const colors: Record<string, string> = {
    SALARIO: "bg-blue-50 text-blue-700",
    COMISION: "bg-purple-50 text-purple-700",
    OPERATIVO: "bg-amber-50 text-amber-700",
    MARKETING: "bg-pink-50 text-pink-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[cat] ?? "bg-slate-100 text-slate-600"}`}>
      {cat}
    </span>
  );
}

interface EgresoForm {
  concepto: string;
  monto: string;
  moneda: "GTQ" | "USD";
  categoria: Categoria;
  fecha: string;
  nota: string;
}

const emptyForm: EgresoForm = {
  concepto: "",
  monto: "",
  moneda: "GTQ",
  categoria: "OPERATIVO",
  fecha: new Date().toISOString().slice(0, 16),
  nota: "",
};

function EgresoModal({
  egreso,
  onClose,
  onSaved,
}: {
  egreso: Egreso | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EgresoForm>(
    egreso
      ? {
          concepto: egreso.concepto,
          monto: String(Number(egreso.monto)),
          moneda: egreso.moneda as "GTQ" | "USD",
          categoria: egreso.categoria as Categoria,
          fecha: new Date(egreso.fecha).toISOString().slice(0, 16),
          nota: egreso.nota ?? "",
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof EgresoForm>(k: K, v: EgresoForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) {
      setError("Monto debe ser un número positivo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        concepto: form.concepto,
        monto,
        moneda: form.moneda,
        categoria: form.categoria,
        fecha: new Date(form.fecha).toISOString(),
        ...(form.nota ? { nota: form.nota } : {}),
      };
      if (egreso) {
        await api.updateEgreso(egreso.id, data);
      } else {
        await api.createEgreso(data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{egreso ? "Editar egreso" : "Nuevo egreso"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Concepto</label>
            <input
              required
              value={form.concepto}
              onChange={(e) => setField("concepto", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Monto</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.monto}
                onChange={(e) => setField("monto", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setField("moneda", e.target.value as "GTQ" | "USD")}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
              >
                <option>GTQ</option>
                <option>USD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setField("categoria", e.target.value as Categoria)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha</label>
              <input
                required
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setField("fecha", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nota (opcional)</label>
            <textarea
              rows={2}
              value={form.nota}
              onChange={(e) => setField("nota", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : egreso ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EgresosTab() {
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [mes, setMes] = useState("");
  const [modal, setModal] = useState<"create" | Egreso | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEgresos(page, categoria || undefined, mes || undefined);
      setEgresos(res.data);
      setTotal(res.meta.total);
    } finally {
      setLoading(false);
    }
  }, [page, categoria, mes]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este egreso?")) return;
    setDeleting(id);
    await api.deleteEgreso(id);
    setDeleting(null);
    load();
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          type="month"
          value={mes}
          onChange={(e) => { setMes(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
        />
        <button
          onClick={() => setModal("create")}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white text-sm font-semibold rounded-lg hover:bg-[#0A2540]/90"
        >
          <Plus className="w-4 h-4" />
          Nuevo egreso
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Concepto</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoría</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Monto</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nota</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>
            ) : egresos.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">Sin egresos registrados</td></tr>
            ) : egresos.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium text-slate-700">{e.concepto}</td>
                <td className="px-5 py-3">{categoriaBadge(e.categoria)}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-700">
                  {e.moneda} {fmt(Number(e.monto))}
                </td>
                <td className="px-5 py-3 text-slate-500">
                  {new Date(e.fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-slate-400 text-xs max-w-[160px] truncate">{e.nota ?? "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setModal(e)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} egresos</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Página {page} de {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {modal && (
        <EgresoModal
          egreso={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

function ReconciliacionTab() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Reconciliacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getReconciliacion(mes)
      .then(setData)
      .finally(() => setLoading(false));
  }, [mes]);

  const totalGTQ = data.reduce((s, r) => s + r.totalGTQ, 0);
  const totalUSD = data.reduce((s, r) => s + r.totalUSD, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-500">Mes:</label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Método de pago</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total GTQ</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Sin pagos en este mes</td></tr>
            ) : data.map((r) => (
              <tr key={r.metodo} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium text-slate-700">{r.metodo}</td>
                <td className="px-5 py-3 text-right text-slate-700">
                  {r.totalGTQ > 0 ? `Q${fmt(r.totalGTQ)}` : "—"}
                </td>
                <td className="px-5 py-3 text-right text-slate-700">
                  {r.totalUSD > 0 ? `$${fmt(r.totalUSD)}` : "—"}
                </td>
              </tr>
            ))}
            {data.length > 0 && (
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-5 py-3 font-bold text-slate-800">Total</td>
                <td className="px-5 py-3 text-right font-bold text-slate-800">Q{fmt(totalGTQ)}</td>
                <td className="px-5 py-3 text-right font-bold text-slate-800">${fmt(totalUSD)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Tab = "egresos" | "reconciliacion";

export default function FinanzasPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("egresos");

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mea_admin_token")) {
      router.replace("/admin/login");
    }
  }, [router]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
        <p className="text-slate-400 text-sm mt-0.5">Gestión de egresos y conciliación de pagos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["egresos", "reconciliacion"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "egresos" ? "Egresos" : "Reconciliación"}
          </button>
        ))}
      </div>

      {tab === "egresos" ? <EgresosTab /> : <ReconciliacionTab />}
    </div>
  );
}
