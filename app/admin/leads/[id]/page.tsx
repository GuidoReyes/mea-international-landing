"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type LeadDetalle } from "@/lib/api";
import { ArrowLeft, Phone, Mail, Calendar, MessageSquare, User } from "lucide-react";

const ESTADO_OPTIONS = [
  { value: "nuevo", label: "Nuevo", style: "bg-blue-50 text-blue-600 border-blue-200", dot: "bg-blue-400" },
  { value: "contactado", label: "Contactado", style: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-400" },
  { value: "inscrito", label: "Inscrito", style: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-400" },
] as const;

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function LeadSkeleton() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <Skeleton className="h-4 w-24 mb-8" />
      <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-1.5" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <Skeleton className="h-4 w-36 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex mb-4 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-56" : "w-44"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

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
    if (!lead || saving || nuevoEstado === estado) return;
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

  if (loading) return <LeadSkeleton />;

  if (!lead) {
    return (
      <div className="px-8 py-8">
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#0A2540] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm">Lead no encontrado</p>
        </div>
      </div>
    );
  }

  const allMessages = lead.conversaciones
    .flatMap((c) => c.mensajes)
    .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());

  const currentEstado = ESTADO_OPTIONS.find((o) => o.value === estado);
  const initials = lead.nombre
    ? lead.nombre.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : lead.telefono.slice(-2);

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.push("/admin")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#0A2540] transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a leads
      </button>

      {/* Lead info card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 bg-[#0A2540]/8 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-[#0A2540] font-bold text-lg">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#0A2540] leading-tight">
              {lead.nombre ?? <span className="text-slate-300 font-normal text-base">Sin nombre</span>}
            </h1>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="font-mono text-xs">+{lead.telefono}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="text-xs">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="text-xs">
                  Registrado el {new Date(lead.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Current status badge */}
          {currentEstado && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentEstado.style} shrink-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentEstado.dot}`} />
              {currentEstado.label}
            </span>
          )}
        </div>

        {lead.interes && (
          <div className="mt-5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Interés</p>
            <p className="text-sm text-slate-600">{lead.interes}</p>
          </div>
        )}

        {/* Estado selector */}
        <div className="mt-5 pt-5 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cambiar estado</p>
          <div className="flex items-center gap-2 flex-wrap">
            {ESTADO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleEstadoChange(opt.value)}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 ${
                  estado === opt.value
                    ? `${opt.style} shadow-sm`
                    : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${estado === opt.value ? opt.dot : "bg-slate-300"}`} />
                {opt.label}
                {saving && estado !== opt.value ? null : null}
              </button>
            ))}
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                Guardando…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conversation card */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-300" />
            <h2 className="text-sm font-semibold text-[#0A2540]">Conversación</h2>
          </div>
          <span className="text-xs text-slate-400">{allMessages.length} mensaje{allMessages.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="px-6 py-6">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm">Sin mensajes todavía</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allMessages.map((msg, i) => {
                const isUser = msg.rol === "user";
                const prevMsg = allMessages[i - 1];
                const showDate =
                  !prevMsg ||
                  new Date(msg.creadoEn).toDateString() !== new Date(prevMsg.creadoEn).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-xs text-slate-300 font-medium">
                          {new Date(msg.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                    )}
                    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-slate-100 text-slate-700 rounded-tl-sm"
                            : "bg-[#0A2540] text-white rounded-tr-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
                        <p className={`text-[10px] mt-1.5 ${isUser ? "text-slate-400" : "text-slate-400"}`}>
                          {new Date(msg.creadoEn).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
