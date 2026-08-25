"use client";

import { useEffect, useState } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { api, type ReporteLeccion } from "@/lib/api";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
}

export default function ReportesLeccionPage() {
  const [reportes, setReportes] = useState<ReporteLeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendientes" | "resueltos" | "todos">("pendientes");
  const [resolviendoId, setResolviendoId] = useState<number | null>(null);

  function cargar() {
    setLoading(true);
    const resuelto = filtro === "todos" ? undefined : filtro === "resueltos";
    api
      .getReportesLeccion(resuelto)
      .then(setReportes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolver(id: number) {
    setResolviendoId(id);
    try {
      await api.resolverReporteLeccion(id);
      setReportes((prev) => prev.map((r) => (r.id === id ? { ...r, resuelto: true } : r)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo marcar como resuelto");
    } finally {
      setResolviendoId(null);
    }
  }

  const filtros = [
    { value: "pendientes" as const, label: "Pendientes" },
    { value: "resueltos" as const, label: "Resueltos" },
    { value: "todos" as const, label: "Todos" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Reportes de lección</h1>
        <p className="text-slate-400 text-sm mt-1">
          Mensajes de alumnos avisando que algo funciona mal en una lección.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          {filtros.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtro === f.value
                  ? "bg-[#0A2540] text-white"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
          {!loading && <span className="ml-auto text-xs text-slate-400">{reportes.length} resultado{reportes.length !== 1 ? "s" : ""}</span>}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-50">
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha y hora</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Alumno</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lección</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mensaje</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                </tr>
              ))
            ) : reportes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Flag className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">No hay reportes{filtro !== "todos" ? ` ${filtro}` : ""}</p>
                  </div>
                </td>
              </tr>
            ) : (
              reportes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors align-top">
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatearFecha(r.creadoEn)}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#0A2540]">{r.alumno.nombre} {r.alumno.apellido}</p>
                    <p className="text-xs text-slate-400">{r.alumno.email ?? r.alumno.whatsapp ?? r.alumno.carnet}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{r.leccion.titulo}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-md">{r.mensaje}</td>
                  <td className="px-6 py-4">
                    {r.resuelto ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolver(r.id)}
                        disabled={resolviendoId === r.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#0A2540] hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        {resolviendoId === r.id ? "..." : "Marcar resuelto"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
