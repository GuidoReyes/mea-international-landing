"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, PlayCircle, Sparkles } from "lucide-react";
import { RutaCurriculum, LeccionCurriculum, NIVELES, colorBadgeNivel } from "@/lib/rutas";
import { alumnoApi, getAlumnoToken } from "@/lib/alumno-api";

function LessonItem({ leccion, rutaSlug }: { leccion: LeccionCurriculum; rutaSlug: string }) {
  const completada = leccion.completada === true;

  const contenido = (
    <>
      {completada ? (
        <CheckCircle2 className="w-4 h-4 text-[#00C4B4] shrink-0" />
      ) : leccion.bloqueada ? (
        <Lock className="w-4 h-4 text-slate-300 shrink-0" />
      ) : (
        <PlayCircle className="w-4 h-4 text-[#00C4B4] shrink-0" />
      )}
      <span
        className={`text-sm ${
          leccion.bloqueada ? "text-slate-400" : "text-[#0A2540] font-medium"
        } ${completada ? "line-through decoration-slate-300" : ""}`}
      >
        {leccion.titulo}
      </span>
      {leccion.esGratis && (
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#00C4B4] bg-[#00C4B4]/10 px-2.5 py-0.5 rounded-full shrink-0">
          <Sparkles className="w-3 h-3" /> Gratis
        </span>
      )}
    </>
  );

  const clases = `flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
    leccion.bloqueada
      ? "bg-slate-50 border-slate-100"
      : "bg-white border-[#00C4B4]/30 hover:border-[#00C4B4]"
  }`;

  if (leccion.bloqueada) {
    return <li className={clases}>{contenido}</li>;
  }

  return (
    <li>
      <Link href={`/cursos/${rutaSlug}/leccion/${leccion.slug}`} className={clases}>
        {contenido}
      </Link>
    </li>
  );
}

export default function RutaDetalleClient({ inicial }: { inicial: RutaCurriculum }) {
  const [ruta, setRuta] = useState<RutaCurriculum>(inicial);
  const esGeneral = inicial.slug === "general";
  const nivelesDisponibles = esGeneral
    ? NIVELES.filter((n) => inicial.capitulos.some((c) => c.nivel === n))
    : [];
  const [tabActivo, setTabActivo] = useState(nivelesDisponibles[0] ?? "A1");

  useEffect(() => {
    if (!getAlumnoToken()) return;
    alumnoApi
      .getRuta(inicial.slug)
      .then((actualizado) => setRuta(actualizado))
      .catch(() => {
        // Sesión expirada u otro error: se queda con la vista pública (bloqueada)
        // ya renderizada por el servidor en vez de romper la página.
      });
  }, [inicial.slug]);

  const capitulosVisibles = esGeneral
    ? ruta.capitulos.filter((c) => c.nivel === tabActivo)
    : ruta.capitulos;

  return (
    <div>
      {typeof ruta.porcentaje === "number" && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-[#0A2540]">Tu progreso en esta ruta</span>
            <span className="text-slate-400">{ruta.porcentaje}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00C4B4] rounded-full transition-all"
              style={{ width: `${ruta.porcentaje}%` }}
            />
          </div>
        </div>
      )}

      {!esGeneral && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <span
            className={`inline-flex items-center text-sm font-bold px-4 py-1.5 rounded-full mb-3 ${colorBadgeNivel(
              ruta.nivelMinimo,
              ruta.nivelMaximo
            )}`}
          >
            Nivel: {ruta.nivelMinimo}–{ruta.nivelMaximo}
          </span>
          <h2 className="text-sm font-bold text-[#0A2540] mb-1">¿Por qué este nivel?</h2>
          <p className="text-sm text-slate-500">{ruta.descripcion}</p>
        </div>
      )}

      {esGeneral && nivelesDisponibles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {nivelesDisponibles.map((nivel) => (
            <button
              key={nivel}
              onClick={() => setTabActivo(nivel)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                tabActivo === nivel
                  ? "bg-[#0A2540] text-white shadow-md"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-[#00C4B4]/50 hover:text-[#0A2540]"
              }`}
            >
              {nivel}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {capitulosVisibles.map((capitulo, index) => (
          <section key={capitulo.id}>
            <h2 className="text-lg font-bold text-[#0A2540] mb-3">
              <span className="text-slate-300 mr-2">{String(index + 1).padStart(2, "0")}</span>
              {capitulo.titulo}
            </h2>
            <ul className="space-y-2">
              {capitulo.lecciones.map((leccion) => (
                <LessonItem key={leccion.id} leccion={leccion} rutaSlug={ruta.slug} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {capitulosVisibles.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          Todavía no hay capítulos publicados en este nivel.
        </div>
      )}

      {ruta.capitulos.some((c) => c.lecciones.some((l) => l.bloqueada)) && (
        <div className="mt-12 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-[#0A2540]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-[#0A2540]" />
          </div>
          <h3 className="text-xl font-bold text-[#0A2540] mb-2">Desbloqueá la ruta completa</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Con un plan de MEA accedés a todas las lecciones de esta ruta y de todo el catálogo,
            con certificado al finalizar.
          </p>
          <Link
            href="/planes"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all shadow-lg shadow-[#00C4B4]/30"
          >
            Ver planes y precios
          </Link>
        </div>
      )}
    </div>
  );
}
