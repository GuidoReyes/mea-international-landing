"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { api, type AlumnoDetalle, type Edicion, type Inscripcion, type Pago } from "@/lib/api";
import { ArrowLeft, GraduationCap, Mail, Phone, X, Loader2, BookOpen, CreditCard, MessageSquare } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

const INSCRIPCION_STYLES: Record<string, string> = {
  ACTIVA:     "bg-emerald-50 text-emerald-600 border-emerald-100",
  COMPLETADA: "bg-blue-50 text-blue-600 border-blue-100",
  CANCELADA:  "bg-red-50 text-red-500 border-red-100",
  SUSPENDIDA: "bg-amber-50 text-amber-600 border-amber-100",
};

const PAGO_STYLES: Record<string, string> = {
  PENDIENTE:   "bg-amber-50 text-amber-600 border-amber-100",
  COMPLETADO:  "bg-emerald-50 text-emerald-600 border-emerald-100",
  RECHAZADO:   "bg-red-50 text-red-500 border-red-100",
  REEMBOLSADO: "bg-slate-50 text-slate-500 border-slate-100",
};

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  DEPOSITO: "Depósito",
  OTRO: "Otro",
};

function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
  const initials = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
  return (
    <div className="w-16 h-16 rounded-2xl bg-[#0A2540] flex items-center justify-center shrink-0">
      <span className="text-white font-bold text-xl tracking-tight">{initials}</span>
    </div>
  );
}

function NuevaInscripcionModal({
  alumnoId,
  onClose,
  onCreated,
}: {
  alumnoId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [edicionId, setEdicionId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getEdiciones().then((r) => setEdiciones(r.data)).catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!edicionId) return;
    setSaving(true);
    setError("");
    try {
      await api.createInscripcion(alumnoId, Number(edicionId));
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear inscripción");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#0A2540]">Nueva inscripción</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Edición del curso *</label>
            <select
              required
              value={edicionId}
              onChange={(e) => setEdicionId(e.target.value ? Number(e.target.value) : "")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4] bg-white"
            >
              <option value="">Seleccionar edición...</option>
              {ediciones.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.curso.nombre} — {ed.nombre} (Q{ed.precio})
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !edicionId} className="flex-1 bg-[#0A2540] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Inscribir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InscripcionesTab({ inscripciones, alumnoId, onRefresh }: { inscripciones: Inscripcion[]; alumnoId: number; onRefresh: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      {modalOpen && (
        <NuevaInscripcionModal
          alumnoId={alumnoId}
          onClose={() => setModalOpen(false)}
          onCreated={onRefresh}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{inscripciones.length} inscripción{inscripciones.length !== 1 ? "es" : ""}</p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#0A2540] text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-[#0A2540]/90 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Nueva inscripción
        </button>
      </div>

      {inscripciones.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-4 h-4 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">Sin inscripciones</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-50">
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Curso / Edición</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Precio</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inscripciones.map((ins) => (
                <tr key={ins.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#0A2540]">{ins.edicion.curso.nombre}</p>
                    <p className="text-xs text-slate-400">{ins.edicion.nombre}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${INSCRIPCION_STYLES[ins.estado] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>
                      {ins.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#0A2540]">Q{ins.edicion.precio}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {new Date(ins.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PagosTab({ inscripciones }: { inscripciones: Inscripcion[] }) {
  const allPagos: Array<Pago & { cursoNombre: string }> = inscripciones.flatMap((ins) =>
    ins.pagos.map((p) => ({ ...p, cursoNombre: ins.edicion.curso.nombre }))
  );

  if (allPagos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <CreditCard className="w-4 h-4 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">Sin pagos registrados</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-50">
            <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Curso</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Monto</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Método</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {allPagos.map((pago) => (
            <tr key={pago.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-medium text-[#0A2540]">{pago.cursoNombre}</td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PAGO_STYLES[pago.estado] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>
                  {pago.estado}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <span className="font-medium text-[#0A2540]">Q{pago.monto}</span>
                {pago.montoUSD && <span className="text-xs text-slate-400 ml-1.5">${pago.montoUSD}</span>}
              </td>
              <td className="px-5 py-3.5 text-slate-500 text-xs">{METODO_LABELS[pago.metodo] ?? pago.metodo}</td>
              <td className="px-5 py-3.5 text-slate-400 text-xs">
                {new Date(pago.creadoEn).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlumnoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [alumno, setAlumno] = useState<AlumnoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api
      .getAlumno(id)
      .then(setAlumno)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="px-8 py-8 space-y-6">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-5">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !alumno) {
    return (
      <div className="px-8 py-8 text-center">
        <p className="text-slate-400">{error || "Alumno no encontrado"}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#00C4B4] hover:underline">Volver</button>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/alumnos")}
        className="flex items-center gap-1.5 text-slate-400 hover:text-[#0A2540] text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Alumnos
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6 flex items-start gap-5">
        <Avatar nombre={alumno.nombre} apellido={alumno.apellido} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-[#0A2540]">{alumno.nombre} {alumno.apellido}</h1>
            <span className="font-mono text-xs bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
              {alumno.carnet}
            </span>
            {!alumno.activo && (
              <span className="text-xs bg-red-50 text-red-400 border border-red-100 px-2 py-0.5 rounded-lg">Inactivo</span>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap mt-2">
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <Mail className="w-3.5 h-3.5" />
              {alumno.email}
            </span>
            {alumno.whatsapp && (
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <Phone className="w-3.5 h-3.5" />
                {alumno.whatsapp}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <GraduationCap className="w-3.5 h-3.5" />
              {alumno.inscripciones.length} inscripción{alumno.inscripciones.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="inscripciones">
        <Tabs.List className="flex gap-1 mb-5 bg-slate-50 p-1 rounded-xl w-fit">
          {[
            { value: "inscripciones", label: "Inscripciones", icon: BookOpen },
            { value: "pagos", label: "Pagos", icon: CreditCard },
            { value: "conversaciones", label: "Conversaciones", icon: MessageSquare },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 transition-all data-[state=active]:bg-white data-[state=active]:text-[#0A2540] data-[state=active]:shadow-sm hover:text-slate-600"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="inscripciones">
          <InscripcionesTab
            inscripciones={alumno.inscripciones}
            alumnoId={alumno.id}
            onRefresh={load}
          />
        </Tabs.Content>

        <Tabs.Content value="pagos">
          <PagosTab inscripciones={alumno.inscripciones} />
        </Tabs.Content>

        <Tabs.Content value="conversaciones">
          <div className="text-center py-12">
            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">Las conversaciones se vinculan vía WhatsApp</p>
            {alumno.whatsapp && (
              <button
                onClick={() => router.push(`/admin?search=${alumno.whatsapp}`)}
                className="mt-3 text-xs text-[#00C4B4] hover:underline"
              >
                Ver leads con {alumno.whatsapp}
              </button>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
