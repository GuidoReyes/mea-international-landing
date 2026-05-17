"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ReportesLeads, type ReportesResumen } from "@/lib/api";
import { getToken } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, CartesianGrid,
} from "recharts";
import { TrendingUp, Users, Clock, DollarSign } from "lucide-react";

type Periodo = "7d" | "30d" | "90d";

const PERIODO_LABELS: Record<Periodo, string> = { "7d": "7 días", "30d": "30 días", "90d": "90 días" };

const ESTADO_COLORS: Record<string, string> = {
  nuevo: "#3b82f6",
  contactado: "#f59e0b",
  inscrito: "#10b981",
};

function KPICard({
  label, value, icon: Icon, sub, color,
}: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function MetricasPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [data, setData] = useState<ReportesLeads | null>(null);
  const [resumen, setResumen] = useState<ReportesResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/admin/login"); return; }
    api.getReportesResumen().then(setResumen).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!getToken()) return;
    setLoading(true);
    api.getReportesLeads(periodo)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodo]);

  const valorPipeline = data?.porEtapa.reduce((sum, e) => sum + e.valorTotal, 0) ?? 0;

  const barData = Object.entries(data?.porEstado ?? {}).map(([estado, count]) => ({
    estado: estado.charAt(0).toUpperCase() + estado.slice(1),
    cantidad: count,
    fill: ESTADO_COLORS[estado] ?? "#94a3b8",
  }));

  const maxEtapa = Math.max(...(data?.porEtapa.map((e) => e.count) ?? [1]), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Métricas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Dashboard de rendimiento del CRM</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(["7d", "30d", "90d"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                periodo === p
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total leads"
          value={data?.totalLeads ?? "—"}
          icon={Users}
          sub={`+${resumen?.nuevosUltimos7dias ?? 0} esta semana`}
          color="bg-blue-50 text-blue-600"
        />
        <KPICard
          label="Tasa conversión"
          value={data ? `${data.tasaConversion}%` : "—"}
          icon={TrendingUp}
          sub="leads inscritos / total"
          color="bg-emerald-50 text-emerald-600"
        />
        <KPICard
          label="Tiempo cierre"
          value={data?.tiempoPromedioCierre != null ? `${data.tiempoPromedioCierre}d` : "—"}
          icon={Clock}
          sub="promedio días en cerrar"
          color="bg-amber-50 text-amber-600"
        />
        <KPICard
          label="Valor pipeline"
          value={valorPipeline > 0 ? `Q${valorPipeline.toLocaleString()}` : "—"}
          icon={DollarSign}
          sub="estimado total"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Nuevos leads — {PERIODO_LABELS[periodo]}</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Cargando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.evolucion ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A2540" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#0A2540" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="total" stroke="#0A2540" strokeWidth={2} fill="url(#gradLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por estado */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Leads por estado</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Cargando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="estado" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Funnel por etapa */}
      {data && data.porEtapa.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pipeline por etapa CRM</h2>
          <div className="space-y-2.5">
            {data.porEtapa
              .filter((e) => e.count > 0)
              .map((etapa) => (
                <div key={etapa.etapaId} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 shrink-0 truncate">{etapa.nombre}</span>
                  <div className="flex-1 bg-slate-50 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 transition-all duration-500"
                      style={{
                        width: `${Math.max(8, (etapa.count / maxEtapa) * 100)}%`,
                        backgroundColor: "#0A2540",
                        opacity: 0.7 + (etapa.count / maxEtapa) * 0.3,
                      }}
                    >
                      <span className="text-white text-xs font-semibold">{etapa.count}</span>
                    </div>
                  </div>
                  {etapa.valorTotal > 0 && (
                    <span className="text-xs text-slate-400 w-24 text-right shrink-0">
                      Q{etapa.valorTotal.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
