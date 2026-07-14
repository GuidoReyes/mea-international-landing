"use client";

import { useState } from "react";
import { X, MessageCircle, Mail, Loader2 } from "lucide-react";
import { alumnoApi, setAlumnoToken } from "@/lib/alumno-api";

type Tab = "whatsapp" | "correo";
type PasoOtp = "numero" | "codigo";

interface RegisterModalProps {
  titulo?: string;
  descripcion?: string;
  onClose: () => void;
  onRegistrado: () => void; // sesión ya guardada; el caller decide (recargar, cerrar, etc.)
}

export default function RegisterModal({
  titulo = "Creá tu cuenta gratis",
  descripcion = "Desbloqueá el resto de la ruta creando tu cuenta gratis.",
  onClose,
  onRegistrado,
}: RegisterModalProps) {
  const [tab, setTab] = useState<Tab>("whatsapp");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp + OTP (camino principal en Guatemala)
  const [pasoOtp, setPasoOtp] = useState<PasoOtp>("numero");
  const [whatsapp, setWhatsapp] = useState("");
  const [nombreWa, setNombreWa] = useState("");
  const [codigo, setCodigo] = useState("");

  // Correo + contraseña
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSolicitarOtp(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await alumnoApi.otpSolicitar(whatsapp);
      setPasoOtp("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificarOtp(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await alumnoApi.otpVerificar(whatsapp, codigo, nombreWa || undefined);
      setAlumnoToken(res.token);
      onRegistrado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código incorrecto");
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistroEmail(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await alumnoApi.registro({ nombre, email, password });
      setAlumnoToken(res.token);
      onRegistrado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0A2540]">{titulo}</h2>
            <p className="text-sm text-slate-500 mt-1">{descripcion}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6">
          <div className="flex bg-slate-50 rounded-full p-1 gap-1">
            <button
              onClick={() => { setTab("whatsapp"); setError(null); }}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === "whatsapp" ? "bg-[#0A2540] text-white shadow" : "text-slate-500"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp (recomendado)
            </button>
            <button
              onClick={() => { setTab("correo"); setError(null); }}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === "correo" ? "bg-[#0A2540] text-white shadow" : "text-slate-500"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Correo
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
          )}

          {tab === "whatsapp" && pasoOtp === "numero" && (
            <form onSubmit={handleSolicitarOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tu nombre</label>
                <input
                  value={nombreWa}
                  onChange={(e) => setNombreWa(e.target.value)}
                  placeholder="Ej: María López"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Número de WhatsApp *
                </label>
                <input
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="5555-5555"
                  inputMode="tel"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Te enviamos un código de 6 dígitos por WhatsApp. Sin contraseñas.
                </p>
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#00C4B4] text-white rounded-full font-bold text-sm hover:bg-[#00a898] disabled:opacity-50 transition-all"
              >
                {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviarme el código
              </button>
            </form>
          )}

          {tab === "whatsapp" && pasoOtp === "codigo" && (
            <form onSubmit={handleVerificarOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Código de 6 dígitos (revisá tu WhatsApp)
                </label>
                <input
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className={`${inputClass} text-center text-xl font-mono tracking-[0.5em]`}
                />
              </div>
              <button
                type="submit"
                disabled={cargando || codigo.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#00C4B4] text-white rounded-full font-bold text-sm hover:bg-[#00a898] disabled:opacity-50 transition-all"
              >
                {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                Verificar y crear cuenta
              </button>
              <button
                type="button"
                onClick={() => { setPasoOtp("numero"); setCodigo(""); setError(null); }}
                className="w-full text-xs text-slate-400 hover:text-[#0A2540] transition-colors"
              >
                Cambiar número o pedir otro código
              </button>
            </form>
          )}

          {tab === "correo" && (
            <form onSubmit={handleRegistroEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tu nombre *</label>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: María López"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Correo *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@ejemplo.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Contraseña * (mínimo 8 caracteres)
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#00C4B4] text-white rounded-full font-bold text-sm hover:bg-[#00a898] disabled:opacity-50 transition-all"
              >
                {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear cuenta
              </button>
            </form>
          )}

          <p className="text-xs text-slate-400 text-center mt-4">
            ¿Ya tenés cuenta?{" "}
            <a href="/alumno/login" className="text-[#00C4B4] font-semibold hover:underline">
              Iniciá sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
