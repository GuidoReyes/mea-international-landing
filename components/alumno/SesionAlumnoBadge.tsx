"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle2, LogOut } from "lucide-react";
import { alumnoApi, getAlumnoToken, clearAlumnoToken, type Alumno } from "@/lib/alumno-api";

// Indicador de sesión del portal de alumnos (esquina superior derecha de las
// páginas de cursos/lecciones/clases). Muestra quién está conectado y permite
// cerrar sesión con confirmación. El progreso NO se guarda al cerrar sesión:
// ya quedó guardado al completar cada lección — el diálogo lo recuerda.
export default function SesionAlumnoBadge() {
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [cargado, setCargado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!getAlumnoToken()) {
      setCargado(true);
      return;
    }
    alumnoApi
      .getMe()
      .then((me) => setAlumno(me))
      .catch(() => setAlumno(null))
      .finally(() => setCargado(true));
  }, []);

  function cerrarSesion() {
    clearAlumnoToken();
    window.location.href = "/";
  }

  if (!cargado) return null;

  if (!alumno) {
    return (
      <Link
        href="/alumno/login"
        className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/20 transition-all"
      >
        <UserCircle2 className="w-4 h-4" /> Iniciar sesión
      </Link>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full">
          <UserCircle2 className="w-4 h-4 text-[#00C4B4]" />
          {alumno.nombre} {alumno.apellido}
          <span className="text-white/50 font-mono">· {alumno.carnet}</span>
        </span>
        <button
          onClick={() => setConfirmando(true)}
          aria-label="Cerrar sesión"
          className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white/70 text-xs px-3 py-2 rounded-full hover:bg-red-500/20 hover:text-white transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold text-[#0A2540] mb-2">¿Cerrar sesión?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Tranquilo: tu progreso ya está guardado. Cada lección completada y su
              puntaje se registran al instante en tu perfil, y son los que cuentan
              para tu certificado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-full py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarSesion}
                className="flex-1 bg-[#0A2540] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#0d2f4f] transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
