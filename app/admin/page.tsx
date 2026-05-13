"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Lead, type LeadsResponse } from "@/lib/api";
import { Users, MessageSquare, UserCheck, UserPlus } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  inscrito: "Inscrito",
};

const ESTADO_STYLES: Record<string, string> = {
  nuevo: "bg-blue-50 text-blue-600 border-blue-100",
  contactado: "bg-amber-50 text-amber-600 border-amber-100",
  inscrito: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

const ESTADO_DOT: Record<string, string> = {
  nuevo: "bg-blue-400",
  contactado: "bg-amber-400",
  inscrito: "bg-emerald-400",
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-10 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-[#0A2540] leading-none mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getLeads(page, estadoFilter || undefined)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, estadoFilter]);

  const total = data?.meta.total ?? 0;
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  const counts = {
    nuevo: data?.data.filter((l) => l.estado === "nuevo").length ?? 0,
    contactado: data?.data.filter((l) => l.estado === "contactado").length ?? 0,
    inscrito: data?.data.filter((l) => l.estado === "inscrito").length ?? 0,
  };

  const filters = [
    { value: "", label: "Todos" },
    { value: "nuevo", label: "Nuevo" },
    { value: "contactado", label: "Contactado" },
    { value: "inscrito", label: "Inscrito" },
  ];

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Leads</h1>
        <p className="text-slate-400 text-sm mt-1">Gestión de prospectos y conversaciones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total leads" value={total} icon={Users} color="bg-[#0A2540]/8 text-[#0A2540]" loading={loading} />
        <StatCard label="Nuevos" value={counts.nuevo} icon={UserPlus} color="bg-blue-50 text-blue-500" loading={loading} />
        <StatCard label="Contactados" value={counts.contactado} icon={MessageSquare} color="bg-amber-50 text-amber-500" loading={loading} />
        <StatCard label="Inscritos" value={counts.inscrito} icon={UserCheck} color="bg-emerald-50 text-emerald-500" loading={loading} />
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setEstadoFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  estadoFilter === f.value
                    ? "bg-[#0A2540] text-white"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-xs text-slate-400">
              {total} resultado{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-50">
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversaciones</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-6" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">No hay leads{estadoFilter ? ` con estado "${estadoFilter}"` : ""}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.data.map((lead: Lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/admin/leads/${lead.id}`)}
                  className="hover:bg-slate-50/60 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500 group-hover:text-[#0A2540] transition-colors">
                      +{lead.telefono}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-[#0A2540]">
                    {lead.nombre ?? <span className="text-slate-300 font-normal">Sin nombre</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ESTADO_STYLES[lead.estado] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT[lead.estado] ?? "bg-slate-300"}`} />
                      {ESTADO_LABELS[lead.estado] ?? lead.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-slate-500">{lead._count?.conversaciones ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(lead.creadoEn).toLocaleDateString("es-GT", {
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
            <span className="text-xs text-slate-400">
              Página {page} de {totalPages}
            </span>
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
