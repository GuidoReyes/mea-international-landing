"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type ReportesResumen, type ReportesLeads } from "@/lib/api";
import { getToken } from "@/lib/api";
import { Users, GraduationCap, TrendingUp, DollarSign, KanbanSquare, BarChart2, ArrowRight } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function KPICard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#0A2540] leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-1 shrink-0" />
    </Link>
  );
}

function QuickLink({ href, icon: Icon, label, description }: {
  href: string; icon: React.ElementType; label: string; description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#0A2540]/8 transition-colors">
        <Icon className="w-4 h-4 text-slate-500 group-hover:text-[#0A2540]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 transition-colors" />
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [resumen, setResumen] = useState<ReportesResumen | null>(null);
  const [leads, setLeads] = useState<ReportesLeads | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/admin/login"); return; }
    Promise.all([
      api.getReportesResumen(),
      api.getReportesLeads("30d"),
    ]).then(([r, l]) => { setResumen(r); setLeads(l); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const today = new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{today}</p>
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight mt-1">Bienvenido al panel</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen general de MEA International</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : (
          <>
            <KPICard
              label="Total leads"
              value={resumen?.totalLeads ?? 0}
              sub={`+${resumen?.nuevosUltimos7dias ?? 0} esta semana`}
              icon={Users}
              color="bg-blue-50 text-blue-600"
              href="/admin/leads"
            />
            <KPICard
              label="Tasa conversión"
              value={leads ? `${leads.tasaConversion}%` : "—"}
              sub="leads → inscritos"
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600"
              href="/admin/metricas"
            />
            <KPICard
              label="Inscritos activos"
              value={resumen?.inscripcionesActivas ?? 0}
              sub="inscripciones vigentes"
              icon={GraduationCap}
              color="bg-purple-50 text-purple-600"
              href="/admin/alumnos"
            />
            <KPICard
              label="Ingresos mes"
              value={resumen ? `Q${resumen.ingresosMes.toLocaleString()}` : "—"}
              sub="pagos completados"
              icon={DollarSign}
              color="bg-amber-50 text-amber-600"
              href="/admin/metricas"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-700">Leads recientes</h2>
            <Link href="/admin/leads" className="text-xs text-[#00C4B4] font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(leads?.porEstado
                ? Object.entries(leads.porEstado).map(([estado, count]) => ({ estado, count }))
                : []
              ).map(({ estado, count }) => (
                <div key={estado} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    estado === "nuevo" ? "bg-blue-400" :
                    estado === "contactado" ? "bg-amber-400" :
                    estado === "inscrito" ? "bg-emerald-400" : "bg-slate-300"
                  }`} />
                  <span className="text-sm font-medium text-slate-700 capitalize flex-1">{estado}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-full rounded-full ${
                          estado === "nuevo" ? "bg-blue-400" :
                          estado === "contactado" ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${resumen?.totalLeads ? (count / resumen.totalLeads) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#0A2540] w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {!leads && <p className="text-slate-400 text-sm text-center py-4">Sin datos</p>}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Accesos rápidos</h2>
          <div className="space-y-1">
            <QuickLink href="/admin/leads" icon={Users} label="Leads" description="Prospectos y conversaciones" />
            <QuickLink href="/admin/crm" icon={KanbanSquare} label="Pipeline CRM" description="Gestión de oportunidades" />
            <QuickLink href="/admin/alumnos" icon={GraduationCap} label="Alumnos" description="Estudiantes inscritos" />
            <QuickLink href="/admin/metricas" icon={BarChart2} label="Métricas" description="Reportes y analytics" />
          </div>
        </div>
      </div>
    </div>
  );
}
