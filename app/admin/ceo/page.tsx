"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api, type PLMes, type Proyeccion, type FlujoCaja } from "@/lib/api";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KPICard({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${positive === true ? "text-emerald-600" : positive === false ? "text-red-500" : "text-slate-800"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CEOPage() {
  const router = useRouter();
  const [pl, setPl] = useState<PLMes[]>([]);
  const [proyecciones, setProyecciones] = useState<Proyeccion[]>([]);
  const [flujo, setFlujo] = useState<FlujoCaja | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then((me) => {
        if (me.rol !== "SUPER_ADMIN") {
          router.replace("/admin");
          return;
        }
        return Promise.all([api.getPL(), api.getProyecciones(), api.getFlujoCaja()]);
      })
      .then((results) => {
        if (!results) return;
        const [plData, proyData, flujoData] = results;
        setPl(plData);
        setProyecciones(proyData);
        setFlujo(flujoData);
        setLoading(false);
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const lastMonth = pl[pl.length - 1];
  const prevMonth = pl[pl.length - 2];
  const totalIngresos12 = pl.reduce((s, m) => s + m.ingresos, 0);
  const totalEgresos12 = pl.reduce((s, m) => s + m.egresos, 0);
  const totalUtilidad12 = totalIngresos12 - totalEgresos12;

  const ingresosDelta = prevMonth && prevMonth.ingresos > 0
    ? ((lastMonth.ingresos - prevMonth.ingresos) / prevMonth.ingresos) * 100
    : null;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel CEO</h1>
        <p className="text-slate-400 text-sm mt-0.5">Vista financiera consolidada</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Ingresos últimos 12 meses"
          value={`Q${fmt(totalIngresos12)}`}
        />
        <KPICard
          label="Egresos últimos 12 meses"
          value={`Q${fmt(totalEgresos12)}`}
        />
        <KPICard
          label="Utilidad acumulada 12m"
          value={`Q${fmt(totalUtilidad12)}`}
          positive={totalUtilidad12 >= 0}
        />
        <KPICard
          label="Saldo actual"
          value={`Q${fmt(flujo?.saldoActual ?? 0)}`}
          positive={(flujo?.saldoActual ?? 0) >= 0}
        />
      </div>

      {/* P&L chart */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">P&L mensual — últimos 12 meses</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingresos vs egresos vs utilidad neta
            </p>
          </div>
          {ingresosDelta !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${ingresosDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {ingresosDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(ingresosDelta).toFixed(1)}% vs mes anterior
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pl} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v) => [`Q${fmt(Number(v))}`, undefined]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ingresos" stroke="#00C4B4" strokeWidth={2} dot={false} name="Ingresos" />
            <Line type="monotone" dataKey="egresos" stroke="#f87171" strokeWidth={2} dot={false} name="Egresos" />
            <Line type="monotone" dataKey="utilidad" stroke="#0A2540" strokeWidth={2} dot={false} name="Utilidad" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Proyecciones */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-[#00C4B4]" />
            <h2 className="text-base font-bold text-slate-800">Proyección de cobros — próximos 6 meses</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={proyecciones} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [`Q${fmt(Number(v))}`, "Cuotas pendientes"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="proyectado" fill="#00C4B4" radius={[4, 4, 0, 0]} name="Proyectado" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flujo de caja 30d */}
        {flujo && (
          <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#00C4B4]" />
              <h2 className="text-base font-bold text-slate-800">Flujo de caja — próximos 30 días</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-500">Saldo actual</span>
                <span className={`text-sm font-bold ${flujo.saldoActual >= 0 ? "text-slate-800" : "text-red-500"}`}>
                  Q{fmt(flujo.saldoActual)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm text-slate-500">Ingresos proyectados 30d</span>
                <span className="text-sm font-bold text-emerald-600">+Q{fmt(flujo.ingresoProyectado30dias)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-slate-500">Egresos proyectados 30d</span>
                <span className="text-sm font-bold text-red-500">-Q{fmt(flujo.egresoProyectado30dias)}</span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg border ${flujo.flujoPROyectado30dias >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <span className="text-sm font-semibold text-slate-700">Flujo neto proyectado</span>
                <span className={`text-base font-bold ${flujo.flujoPROyectado30dias >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  Q{fmt(flujo.flujoPROyectado30dias)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* P&L table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Detalle mensual P&L</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Mes</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Egresos</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilidad</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Margen</th>
              </tr>
            </thead>
            <tbody>
              {[...pl].reverse().map((m) => {
                const margen = m.ingresos > 0 ? (m.utilidad / m.ingresos) * 100 : 0;
                return (
                  <tr key={m.mes} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-700">{m.mes}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-medium">Q{fmt(m.ingresos)}</td>
                    <td className="px-6 py-3 text-right text-red-500 font-medium">Q{fmt(m.egresos)}</td>
                    <td className={`px-6 py-3 text-right font-bold ${m.utilidad >= 0 ? "text-slate-800" : "text-red-600"}`}>
                      Q{fmt(m.utilidad)}
                    </td>
                    <td className={`px-6 py-3 text-right text-xs ${margen >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {margen.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
