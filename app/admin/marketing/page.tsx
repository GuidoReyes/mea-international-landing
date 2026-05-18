"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, type Campana, type CampanaStatus, type Lead } from "@/lib/api";
import { Plus, Send, X, CheckCircle, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";

const ESTADOS_LEAD = ["nuevo", "contactado", "interesado", "inscrito", "descartado"];

function estadoBadge(estado: Campana["estado"]) {
  const map: Record<string, string> = {
    BORRADOR: "bg-slate-100 text-slate-600",
    ENVIANDO: "bg-amber-50 text-amber-700",
    COMPLETADA: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? "bg-slate-100 text-slate-600"}`}>
      {estado}
    </span>
  );
}

function ProgressBar({ progreso, errores }: { progreso: number; errores: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{progreso}% enviado</span>
        {errores > 0 && <span className="text-red-500">{errores} errores</span>}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-[#00C4B4] rounded-full transition-all duration-300"
          style={{ width: `${progreso}%` }}
        />
      </div>
    </div>
  );
}

interface NuevaCampanaModalProps {
  onClose: () => void;
  onCreated: (c: Campana) => void;
}

function NuevaCampanaModal({ onClose, onCreated }: NuevaCampanaModalProps) {
  const [nombre, setNombre] = useState("");
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const c = await api.createCampana({ nombre, template });
      onCreated(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  const previewLead = { nombre: "Juan Pérez", interes: "Excel Avanzado" };
  const preview = template
    .replace(/\{nombre\}/g, previewLead.nombre)
    .replace(/\{curso\}/g, previewLead.interes);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Nueva campaña</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de la campaña</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Promo Mayo Excel"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Mensaje template
              <span className="ml-2 text-slate-400 font-normal">usa {"{nombre}"} y {"{curso}"}</span>
            </label>
            <textarea
              required
              rows={5}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={"Hola {nombre}! 👋 Te escribimos de MEA para contarte sobre {curso}. ¿Te interesa conocer más detalles?"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30 resize-none"
            />
          </div>
          {template && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 mb-1">Vista previa (con datos de ejemplo)</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{preview}</p>
            </div>
          )}
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
              {saving ? "Creando..." : "Crear campaña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EnviarModalProps {
  campana: Campana;
  onClose: () => void;
  onSent: () => void;
}

function EnviarModal({ campana, onClose, onSent }: EnviarModalProps) {
  const token = typeof window !== "undefined" ? localStorage.getItem("mea_admin_token") : null;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"select" | "confirm" | "sending" | "done">("select");
  const [status, setStatus] = useState<CampanaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (estadoFilter) params.set("estado", estadoFilter);
      const res = await fetch(`${API_URL}/api/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { data: Lead[] };
      setLeads(data.data);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, token]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleSend() {
    setSending(true);
    setStep("sending");
    setError(null);
    try {
      await api.enviarCampana(campana.id, Array.from(selected));
      const initial = await api.getCampanaStatus(campana.id);
      setStatus(initial);

      pollRef.current = setInterval(async () => {
        const s = await api.getCampanaStatus(campana.id);
        setStatus(s);
        if (s.estado === "COMPLETADA") {
          clearInterval(pollRef.current!);
          setStep("done");
          onSent();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
      setSending(false);
      setStep("confirm");
    }
  }

  const previewLead = leads[0];
  const previewMsg = previewLead
    ? campana.template
        .replace(/\{nombre\}/g, previewLead.nombre ?? "Cliente")
        .replace(/\{curso\}/g, previewLead.interes ?? "nuestros cursos")
    : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">Enviar campaña</h2>
            <p className="text-xs text-slate-400">{campana.nombre}</p>
          </div>
          {step !== "sending" && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "select" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={estadoFilter}
                  onChange={(e) => { setEstadoFilter(e.target.value); setSelected(new Set()); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/30"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_LEAD.map((e) => <option key={e}>{e}</option>)}
                </select>
                <span className="text-sm text-slate-500">
                  {loading ? "Cargando..." : `${leads.length} leads`}
                </span>
                <span className="text-sm font-semibold text-[#00C4B4]">{selected.size} seleccionados</span>
              </div>

              {previewMsg && selected.size > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Vista previa (primer lead seleccionado)</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewMsg}</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === leads.length && leads.length > 0}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Nombre</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Teléfono</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Estado</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Interés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          const s = new Set(selected);
                          if (s.has(lead.id)) s.delete(lead.id); else s.add(lead.id);
                          setSelected(s);
                        }}
                        className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => {
                              const s = new Set(selected);
                              if (s.has(lead.id)) s.delete(lead.id); else s.add(lead.id);
                              setSelected(s);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-700">{lead.nombre ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{lead.telefono}</td>
                        <td className="px-4 py-2">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{lead.estado}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{lead.interes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800">
                  ¿Confirmar envío a {selected.size} leads?
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Esta acción no se puede deshacer. Se enviará el mensaje a todos los leads seleccionados por WhatsApp.
                </p>
              </div>
              {previewMsg && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Mensaje a enviar (ejemplo)</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewMsg}</p>
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {step === "sending" && (
            <div className="space-y-4 py-4">
              <p className="text-sm font-semibold text-slate-700 text-center">Enviando mensajes...</p>
              {status && (
                <>
                  <ProgressBar progreso={status.progreso} errores={status.errores} />
                  <p className="text-sm text-slate-500 text-center">
                    {status.enviados} / {status.totalDestinatarios} enviados
                  </p>
                </>
              )}
            </div>
          )}

          {step === "done" && status && (
            <div className="space-y-4 py-4 text-center">
              {status.errores === 0 ? (
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              ) : (
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              )}
              <p className="font-bold text-slate-800">Campaña completada</p>
              <p className="text-sm text-slate-500">
                {status.enviados} enviados · {status.errores} errores
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
          {step === "select" && (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={selected.size === 0}
                className="flex-1 px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-40"
              >
                Continuar ({selected.size})
              </button>
            </>
          )}
          {step === "confirm" && (
            <>
              <button onClick={() => setStep("select")} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                Atrás
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00C4B4] text-white rounded-lg text-sm font-semibold hover:bg-[#00C4B4]/90 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Enviar ahora
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-semibold">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [enviar, setEnviar] = useState<Campana | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mea_admin_token")) {
      router.replace("/admin/login");
    }
  }, [router]);

  const loadCampanas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCampanas();
      setCampanas(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCampanas(); }, [loadCampanas]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marketing</h1>
          <p className="text-slate-400 text-sm mt-0.5">Campañas de difusión por WhatsApp</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white text-sm font-semibold rounded-lg hover:bg-[#0A2540]/90"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Destinatarios</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Enviados</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Errores</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Creada</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : campanas.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Sin campañas. Crea la primera.</td></tr>
            ) : campanas.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium text-slate-700">{c.nombre}</td>
                <td className="px-5 py-3">{estadoBadge(c.estado)}</td>
                <td className="px-5 py-3 text-right text-slate-600">{c.totalDestinatarios}</td>
                <td className="px-5 py-3 text-right text-emerald-600 font-medium">{c.enviados}</td>
                <td className="px-5 py-3 text-right text-red-500">{c.errores > 0 ? c.errores : "—"}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">
                  {new Date(c.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-right">
                  {c.estado === "BORRADOR" && (
                    <button
                      onClick={() => setEnviar(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C4B4]/10 text-[#00C4B4] text-xs font-semibold rounded-lg hover:bg-[#00C4B4]/20"
                    >
                      <Send className="w-3 h-3" />
                      Enviar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NuevaCampanaModal
          onClose={() => setShowNew(false)}
          onCreated={(c) => { setCampanas((prev) => [c, ...prev]); setShowNew(false); }}
        />
      )}

      {enviar && (
        <EnviarModal
          campana={enviar}
          onClose={() => setEnviar(null)}
          onSent={() => { loadCampanas(); setEnviar(null); }}
        />
      )}
    </div>
  );
}
