"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type LeadDetalle } from "@/lib/api";

const ESTADO_OPTIONS = ["nuevo", "contactado", "inscrito"] as const;

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState("");

  useEffect(() => {
    api.getLead(Number(id))
      .then((data) => {
        setLead(data);
        setEstado(data.estado);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleEstadoChange(nuevoEstado: string) {
    if (!lead || saving) return;
    setSaving(true);
    try {
      await api.patchLead(lead.id, { estado: nuevoEstado });
      setEstado(nuevoEstado);
      setLead((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Cargando...</div>;
  if (!lead) return <div className="text-gray-400 py-12 text-center">Lead no encontrado</div>;

  const allMessages = lead.conversaciones
    .flatMap((c) => c.mensajes)
    .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push("/admin")}
        className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 transition-colors"
      >
        ← Volver
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0A2540]">
              {lead.nombre ?? <span className="text-gray-400 font-normal">Sin nombre</span>}
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">+{lead.telefono}</p>
            {lead.email && <p className="text-sm text-gray-500 mt-0.5">{lead.email}</p>}
          </div>

          <select
            value={estado}
            onChange={(e) => handleEstadoChange(e.target.value)}
            disabled={saving}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4] disabled:opacity-50"
          >
            {ESTADO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>

        {lead.interes && (
          <p className="text-sm text-gray-600 mt-4 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-medium">Interés:</span> {lead.interes}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Registrado el {new Date(lead.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-4">
          Conversación ({allMessages.length} mensajes)
        </h2>

        {allMessages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Sin mensajes</p>
        ) : (
          <div className="space-y-3">
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.rol === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.rol === "user"
                      ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                      : "bg-[#0A2540] text-white rounded-tr-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.contenido}</p>
                  <p className={`text-xs mt-1 ${msg.rol === "user" ? "text-gray-400" : "text-gray-300"}`}>
                    {new Date(msg.creadoEn).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
