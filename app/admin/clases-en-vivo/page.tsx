"use client";

import { useEffect, useState } from "react";
import { Video, CheckCircle2, Users } from "lucide-react";
import { api, type GrupoClaseEnVivo, type SesionConAsistencia } from "@/lib/api";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

const ESTADO_STYLES: Record<string, string> = {
  PROGRAMADA:   "bg-blue-50 text-blue-600 border-blue-100",
  REALIZADA:    "bg-emerald-50 text-emerald-600 border-emerald-100",
  CANCELADA:    "bg-red-50 text-red-500 border-red-100",
  REPROGRAMADA: "bg-amber-50 text-amber-600 border-amber-100",
};

const ESTADO_LABELS: Record<string, string> = {
  PROGRAMADA: "Programada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
  REPROGRAMADA: "Reprogramada",
};

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
}

export default function ClasesEnVivoPage() {
  const [grupos, setGrupos] = useState<GrupoClaseEnVivo[]>([]);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [sesiones, setSesiones] = useState<SesionConAsistencia[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(true);
  const [loadingSesiones, setLoadingSesiones] = useState(false);

  useEffect(() => {
    api
      .getGruposClaseEnVivo()
      .then((data) => {
        setGrupos(data);
        if (data.length > 0) setGrupoId(data[0]!.id);
      })
      .catch(console.error)
      .finally(() => setLoadingGrupos(false));
  }, []);

  useEffect(() => {
    if (grupoId === null) return;
    setLoadingSesiones(true);
    api
      .getSesionesGrupo(grupoId)
      .then((data) => setSesiones(data.sesiones))
      .catch(console.error)
      .finally(() => setLoadingSesiones(false));
  }, [grupoId]);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Clases en vivo</h1>
        <p className="text-slate-400 text-sm mt-1">
          Asistencia real por sesión, registrada por Zoom o marcada a mano. No muestra quién
          estaba inscrito en el grupo porque hoy esa relación no existe en el sistema.
        </p>
      </div>

      {loadingGrupos ? (
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl px-6 py-16 text-center">
          <p className="text-slate-400 text-sm">No hay grupos de clase en vivo creados todavía.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {grupos.map((g) => (
              <button
                key={g.id}
                onClick={() => setGrupoId(g.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  grupoId === g.id
                    ? "bg-[#0A2540] text-white border-[#0A2540]"
                    : "text-slate-500 border-slate-200 hover:bg-slate-50"
                } ${!g.activo ? "opacity-60" : ""}`}
              >
                <Video className="w-3.5 h-3.5" />
                {g.nombre}
                {!g.activo && <span className="text-[10px] opacity-70">(inactivo)</span>}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha y hora</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Asistieron</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingSesiones ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    </tr>
                  ))
                ) : sesiones.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                          <Video className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-slate-400 text-sm">Sin sesiones generadas para este grupo todavía.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sesiones.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatearFechaHora(s.fechaHora)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${ESTADO_STYLES[s.estado]}`}>
                          {ESTADO_LABELS[s.estado]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {s.asistentes.length === 0 ? (
                          <span className="text-xs text-slate-400">Nadie registrado</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5">
                              <Users className="w-3.5 h-3.5" />
                              {s.asistentes.length} alumno{s.asistentes.length !== 1 ? "s" : ""}
                            </span>
                            {s.asistentes.map((a) => (
                              <span key={a.alumnoId} className="flex items-center gap-1.5 text-xs text-slate-600">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                {a.nombre} {a.apellido}
                                <span className="text-slate-400">({a.fuente === "zoom_webhook" ? "Zoom" : "manual"})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
