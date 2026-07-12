"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, BookOpen, ChevronRight, LogOut } from "lucide-react";
import { alumnoApi, clearAlumnoToken, getAlumnoToken, MiCursoProgreso } from "@/lib/alumno-api";

export default function MisCursosPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<MiCursoProgreso[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAlumnoToken()) {
      router.replace("/alumno/login");
      return;
    }
    alumnoApi
      .getMisCursos()
      .then(setCursos)
      .catch((err) => {
        if (err instanceof Error && err.message.includes("Sesión")) {
          router.replace("/alumno/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Error cargando tus cursos");
      });
  }, [router]);

  function handleLogout() {
    clearAlumnoToken();
    router.replace("/alumno/login");
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0A2540] text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mis cursos</h1>
            <p className="text-slate-300 mt-2">Tu progreso y certificados.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        {cursos === null && !error && (
          <p className="text-slate-400 text-center py-12">Cargando...</p>
        )}

        {cursos !== null && cursos.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-6">Todavía no estás inscrito en ningún curso.</p>
            <Link
              href="/cursos"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
            >
              Explorar cursos
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {cursos?.map((curso) => (
            <div
              key={curso.cursoOnlineId}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <Link
                    href={`/cursos/${curso.slug}`}
                    className="text-lg font-bold text-[#0A2540] hover:text-[#00C4B4] transition-colors"
                  >
                    {curso.titulo}
                  </Link>
                  <p className="text-xs text-slate-400 mt-1">
                    Nivel {curso.nivel.toUpperCase()} · {curso.leccionesCompletadas} de{" "}
                    {curso.totalLecciones} lecciones
                  </p>
                </div>
                <Link
                  href={`/cursos/${curso.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#00C4B4] shrink-0"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progreso</span>
                <span>{curso.porcentaje}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00C4B4] rounded-full transition-all"
                  style={{ width: `${curso.porcentaje}%` }}
                />
              </div>

              {curso.certificado && (
                <a
                  href={curso.certificado.urlPdf ?? `/verify-online/${curso.certificado.codigo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A2540] bg-[#00C4B4]/10 px-4 py-2 rounded-full hover:bg-[#00C4B4]/20 transition-colors"
                >
                  <Award className="w-4 h-4 text-[#00C4B4]" /> Ver certificado
                </a>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
