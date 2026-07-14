"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, ChevronLeft, Lock } from "lucide-react";
import { RutaCurriculum, LeccionCurriculum, getRutaCurriculum } from "@/lib/rutas";
import { alumnoApi, getAlumnoToken } from "@/lib/alumno-api";
import type { LeccionContenido } from "@/lib/leccion-contenido";
import LessonPlayer from "@/components/leccion-player/LessonPlayer";
import RegisterModal from "@/components/alumno/RegisterModal";

interface Props {
  rutaSlug: string;
  leccionSlug: string;
}

function esVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function esAudio(url: string): boolean {
  return /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(url);
}

function esEmbed(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|player\./i.test(url);
}

function ContenidoLeccion({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm">
        El contenido de esta lección estará disponible muy pronto.
      </div>
    );
  }
  if (esVideo(url)) {
    return <video controls src={url} className="w-full rounded-2xl bg-black" />;
  }
  if (esAudio(url)) {
    return <audio controls src={url} className="w-full" />;
  }
  if (esEmbed(url)) {
    return (
      <div className="aspect-video">
        <iframe
          src={url}
          className="w-full h-full rounded-2xl border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-6 py-3 bg-[#0A2540] text-white rounded-full font-semibold hover:bg-[#0d2f4f] transition-all"
    >
      Abrir material de la lección
    </a>
  );
}

export default function LeccionClient({ rutaSlug, leccionSlug }: Props) {
  const [ruta, setRuta] = useState<RutaCurriculum | null>(null);
  const [leccion, setLeccion] = useState<LeccionCurriculum | null>(null);
  const [puntaje, setPuntaje] = useState<string>("");
  const [guardando, setGuardando] = useState(false);
  const [certificado, setCertificado] = useState<{ codigo: string; urlPdf: string | null } | null>(null);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [contenidoJugable, setContenidoJugable] = useState<LeccionContenido | null>(null);

  const cargar = useCallback(async () => {
    const detalle = getAlumnoToken()
      ? await alumnoApi.getRuta(rutaSlug).catch(() => getRutaCurriculum(rutaSlug))
      : await getRutaCurriculum(rutaSlug);
    if (!detalle) {
      setError("Ruta no encontrada");
      setCargando(false);
      return;
    }
    setRuta(detalle);
    const encontrada = detalle.capitulos
      .flatMap((cap) => cap.lecciones)
      .find((l) => l.slug === leccionSlug);
    setLeccion(encontrada ?? null);
    if (!encontrada) setError("Lección no encontrada");
    setCargando(false);
  }, [rutaSlug, leccionSlug]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!leccion || leccion.bloqueada) {
      setContenidoJugable(null);
      return;
    }
    let cancelado = false;
    alumnoApi
      .getLeccionJugar(leccion.id)
      .then((resultado) => {
        if (!cancelado) setContenidoJugable(resultado.contenido);
      })
      .catch(() => {
        if (!cancelado) setContenidoJugable(null);
      });
    return () => {
      cancelado = true;
    };
  }, [leccion?.id, leccion?.bloqueada]);

  async function handleCompletar(puntajeJugador?: number) {
    if (!leccion) return;
    setGuardando(true);
    setError(null);
    try {
      const puntajeNum = puntajeJugador !== undefined ? puntajeJugador : puntaje === "" ? undefined : Number(puntaje);
      const resultado = await alumnoApi.completarLeccion(leccion.id, puntajeNum);
      if (resultado.certificado) setCertificado(resultado.certificado);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el progreso");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="text-slate-400 text-center py-16">Cargando...</p>;
  }

  if (!ruta || !leccion) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-6">{error ?? "Lección no encontrada"}</p>
        <Link href={`/cursos/${rutaSlug}`} className="text-[#00C4B4] hover:underline text-sm">
          Volver a la ruta
        </Link>
      </div>
    );
  }

  if (leccion.bloqueada) {
    const sinSesion = getAlumnoToken() === null;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        {mostrarRegistro && (
          <RegisterModal
            titulo="Desbloqueá el resto de la ruta"
            descripcion="Creá tu cuenta gratis y seguí aprendiendo donde te quedaste."
            onClose={() => setMostrarRegistro(false)}
            onRegistrado={() => window.location.reload()}
          />
        )}
        <div className="w-12 h-12 bg-[#0A2540]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#0A2540]" />
        </div>
        <h2 className="text-xl font-bold text-[#0A2540] mb-2">
          {sinSesion ? "Desbloqueá el resto de la ruta" : "Esta lección está bloqueada"}
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          {sinSesion
            ? "Creá tu cuenta gratis para guardar tu progreso y seguir con la ruta."
            : "Desbloqueala con un plan de MEA."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {sinSesion ? (
            <>
              <button
                onClick={() => setMostrarRegistro(true)}
                className="inline-flex items-center px-6 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
              >
                Crear cuenta gratis
              </button>
              <Link
                href="/alumno/login"
                className="inline-flex items-center px-6 py-3 bg-[#0A2540] text-white rounded-full font-bold hover:bg-[#0d2f4f] transition-all"
              >
                Ya tengo cuenta
              </Link>
            </>
          ) : (
            <Link
              href="/planes"
              className="inline-flex items-center px-6 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all"
            >
              Ver planes
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/cursos/${rutaSlug}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0A2540] transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> {ruta.titulo}
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-[#0A2540] mb-6">{leccion.titulo}</h1>

      {contenidoJugable ? (
        <LessonPlayer contenido={contenidoJugable} onTerminado={(puntajeJugador) => handleCompletar(puntajeJugador)} />
      ) : (
        <ContenidoLeccion url={leccion.urlContenido} />
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mt-6">{error}</p>
      )}

      {certificado && (
        <div className="mt-6 bg-[#00C4B4]/10 border border-[#00C4B4]/30 rounded-2xl p-6 text-center">
          <Award className="w-8 h-8 text-[#00C4B4] mx-auto mb-2" />
          <p className="font-bold text-[#0A2540]">¡Completaste el curso con éxito!</p>
          <a
            href={certificado.urlPdf ?? `/verify-online/${certificado.codigo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-3 px-6 py-2.5 bg-[#00C4B4] text-white rounded-full font-bold text-sm hover:bg-[#00a898] transition-all"
          >
            Ver mi certificado
          </a>
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {leccion.completada ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#00C4B4]">
            <CheckCircle2 className="w-5 h-5" /> Lección completada
            {typeof leccion.puntaje === "number" && ` — ${leccion.puntaje}%`}
          </p>
        ) : getAlumnoToken() ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-slate-500">
              Puntaje (opcional):
              <input
                type="number"
                min={0}
                max={100}
                value={puntaje}
                onChange={(e) => setPuntaje(e.target.value)}
                placeholder="0-100"
                className="ml-2 w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C4B4]"
              />
            </label>
            <button
              onClick={() => handleCompletar()}
              disabled={guardando}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {guardando ? "Guardando..." : "Marcar como completada"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            <Link href="/alumno/login" className="text-[#00C4B4] hover:underline">
              Iniciá sesión
            </Link>{" "}
            para guardar tu progreso en esta lección.
          </p>
        )}
      </div>
    </div>
  );
}
