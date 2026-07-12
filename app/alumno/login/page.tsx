"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Lock } from "lucide-react";
import { alumnoApi, setAlumnoToken } from "@/lib/alumno-api";

export default function AlumnoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [primerLogin, setPrimerLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await alumnoApi.login(email, password);
      setAlumnoToken(res.token);
      if (res.primerLogin) {
        setPrimerLogin(true);
      } else {
        router.push("/mis-cursos");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await alumnoApi.cambiarPassword(password, passwordNueva);
      router.push("/mis-cursos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full">
        <div className="w-14 h-14 bg-[#0A2540]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {primerLogin ? (
            <Lock className="w-7 h-7 text-[#00C4B4]" />
          ) : (
            <GraduationCap className="w-7 h-7 text-[#00C4B4]" />
          )}
        </div>
        <h1 className="text-xl font-bold text-[#0A2540] text-center mb-1">
          {primerLogin ? "Creá tu contraseña" : "Portal del alumno"}
        </h1>
        <p className="text-sm text-slate-400 text-center mb-8">
          {primerLogin
            ? "Es tu primer ingreso: elegí una contraseña nueva (mínimo 8 caracteres)."
            : "Ingresá con el correo y la contraseña que te dio tu asesor."}
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5 mb-4 text-center">
            {error}
          </p>
        )}

        {primerLogin ? (
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <input
              type="password"
              required
              minLength={8}
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              placeholder="Contraseña nueva"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C4B4]"
            />
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-[#00C4B4] text-white rounded-xl font-bold hover:bg-[#00a898] transition-all disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar y entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C4B4]"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C4B4]"
            />
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-[#0A2540] text-white rounded-xl font-bold hover:bg-[#0d2f4f] transition-all disabled:opacity-50"
            >
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        )}

        <p className="text-xs text-slate-400 text-center mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/planes" className="text-[#00C4B4] hover:underline">
            Conocé nuestros planes
          </Link>
        </p>
      </div>
    </div>
  );
}
