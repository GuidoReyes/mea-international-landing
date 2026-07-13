"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, GraduationCap } from "lucide-react";
import {
  HorarioClasesResponse,
  DIAS_CORTOS,
  colorBadgeNivelClase,
  etiquetaAudiencia,
  formatearHora12h,
  getHorarioClases,
} from "@/lib/clases-en-vivo";
import { alumnoApi, getAlumnoToken } from "@/lib/alumno-api";

const POLL_MS = 60_000;
const DIAS_CON_CLASES = [1, 2, 3, 4];

function formatearMinutosHasta(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return `${horas} h ${resto} min`;
}

function BannerEnVivo({
  data,
  suscripcionActiva,
  onEntrar,
  entrando,
  error,
}: {
  data: HorarioClasesResponse;
  suscripcionActiva: boolean | null;
  onEntrar: (grupoId: number) => void;
  entrando: boolean;
  error: string | null;
}) {
  const liveNow = data.liveNow[0];
  const grupo = liveNow ? data.grupos.find((g) => g.id === liveNow.grupoId) : null;
  const tieneSesion = getAlumnoToken() !== null;

  if (liveNow && grupo) {
    return (
      <div className="bg-[#0A2540] rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-red-400 font-bold text-sm tracking-wide">EN VIVO AHORA</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{grupo.nombre}</h2>
        <p className="text-slate-300 text-sm mb-6">
          Nivel {grupo.niveles} · Termina en {formatearMinutosHasta(liveNow.minutosRestantes)}
        </p>

        {error && <p className="text-sm text-red-300 bg-red-950/40 rounded-lg px-4 py-2 mb-4">{error}</p>}

        {!tieneSesion ? (
          <Link
            href="/alumno/login"
            className="inline-flex items-center px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
          >
            Iniciá sesión para entrar
          </Link>
        ) : suscripcionActiva === false ? (
          <Link
            href="/planes"
            className="inline-flex items-center px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
          >
            Desbloquear clases en vivo
          </Link>
        ) : (
          <button
            onClick={() => onEntrar(grupo.id)}
            disabled={entrando}
            className="inline-flex items-center px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all disabled:opacity-50"
          >
            {entrando ? "Entrando..." : "Entrar a la clase en Zoom"}
          </button>
        )}
      </div>
    );
  }

  if (data.nextClass) {
    const grupoProximo = data.grupos.find((g) => g.id === data.nextClass!.grupoId);
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Próxima clase</p>
        <h2 className="text-xl font-bold text-[#0A2540] mb-1">{grupoProximo?.nombre}</h2>
        <p className="text-sm text-slate-500">
          {DIAS_CORTOS[data.nextClass.horario.diaSemana]}{" "}
          {formatearHora12h(data.nextClass.horario.horaInicio)} (hora Guatemala) · empieza en{" "}
          {formatearMinutosHasta(data.nextClass.minutosHasta)}
        </p>
      </div>
    );
  }

  return null;
}

export default function ClasesEnVivoClient({ inicial }: { inicial: HorarioClasesResponse }) {
  const [data, setData] = useState<HorarioClasesResponse>(inicial);
  const [suscripcionActiva, setSuscripcionActiva] = useState<boolean | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const actualizado = await getHorarioClases();
      if (actualizado) setData(actualizado);
    }, POLL_MS);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!getAlumnoToken()) return;
    alumnoApi
      .getSuscripcion()
      .then((res) => setSuscripcionActiva(res.activa))
      .catch(() => setSuscripcionActiva(false));
  }, []);

  async function handleEntrar(grupoId: number) {
    setEntrando(true);
    setError(null);
    try {
      const { zoomUrl } = await alumnoApi.entrarClaseEnVivo(grupoId);
      window.open(zoomUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar a la clase");
    } finally {
      setEntrando(false);
    }
  }

  const gruposPorDia = new Map<number, typeof data.grupos>();
  for (const dia of DIAS_CON_CLASES) gruposPorDia.set(dia, []);
  for (const grupo of data.grupos) {
    for (const horario of grupo.horarios) {
      if (!gruposPorDia.has(horario.diaSemana)) continue;
      gruposPorDia.get(horario.diaSemana)!.push(grupo);
    }
  }

  return (
    <div>
      <div className="mb-12">
        <BannerEnVivo
          data={data}
          suscripcionActiva={suscripcionActiva}
          onEntrar={handleEntrar}
          entrando={entrando}
          error={error}
        />
      </div>

      <h2 className="text-xl font-bold text-[#0A2540] mb-6">Horario semanal</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
        {DIAS_CON_CLASES.map((dia) => (
          <div key={dia}>
            <p className="text-sm font-bold text-slate-400 mb-3 text-center">{DIAS_CORTOS[dia]}</p>
            <div className="space-y-3">
              {(gruposPorDia.get(dia) ?? [])
                .filter((g) => g.horarios.some((h) => h.diaSemana === dia))
                .map((grupo) => {
                  const horario = grupo.horarios.find((h) => h.diaSemana === dia)!;
                  const enVivo = data.liveNow.some((c) => c.grupoId === grupo.id);
                  return (
                    <div
                      key={`${grupo.id}-${dia}`}
                      className={`bg-white rounded-xl border p-4 ${
                        enVivo ? "border-[#00C4B4] shadow-md" : "border-slate-100"
                      }`}
                    >
                      {enVivo && (
                        <span className="inline-block text-xs font-bold text-[#00C4B4] mb-1">EN VIVO</span>
                      )}
                      <p className="text-sm font-bold text-[#0A2540] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatearHora12h(horario.horaInicio)}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{grupo.nombre}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          {etiquetaAudiencia(grupo.audiencia)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${colorBadgeNivelClase(grupo.niveles)}`}
                        >
                          {grupo.niveles.replace(/_/g, "-")}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-[#0A2540] mb-6">¿Cómo funcionan?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: GraduationCap, titulo: "1. Contratá tu plan", texto: "Elegí el plan Plataforma + Grupos, que incluye clases en vivo grupales ilimitadas." },
          { icon: Clock, titulo: "2. Revisá tu horario", texto: "Mirá el horario semanal de arriba y ubicá el grupo de tu nivel y edad." },
          { icon: Radio, titulo: "3. Entrá a Zoom", texto: "A la hora de tu clase, volvé a esta página y tocá \"Entrar a la clase en Zoom\"." },
        ].map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="w-10 h-10 bg-[#00C4B4]/10 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-[#00C4B4]" />
            </div>
            <h3 className="font-bold text-[#0A2540] mb-1">{titulo}</h3>
            <p className="text-sm text-slate-500">{texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
