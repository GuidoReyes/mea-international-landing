"use client";

import { useEffect, useState } from "react";
import { api, type PagoDeposito } from "@/lib/api";
import { ExternalLink, Check, X } from "lucide-react";

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-50 text-amber-600 border-amber-100",
  COMPLETADO: "bg-emerald-50 text-emerald-600 border-emerald-100",
  RECHAZADO: "bg-red-50 text-red-600 border-red-100",
};

function formatearMonto(centavos: number, moneda: string): string {
  return `${moneda === "GTQ" ? "Q" : moneda} ${(centavos / 100).toFixed(2)}`;
}

export default function PagosDepositoPage() {
  const [pagos, setPagos] = useState<PagoDeposito[]>([]);
  const [estadoFilter, setEstadoFilter] = useState("PENDIENTE");
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  function cargar() {
    setLoading(true);
    api
      .getPagosDeposito(estadoFilter || undefined)
      .then(setPagos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(cargar, [estadoFilter]);

  async function confirmar(id: number) {
    setProcesandoId(id);
    try {
      await api.confirmarPagoDeposito(id);
      cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al confirmar el pago");
    } finally {
      setProcesandoId(null);
    }
  }

  async function rechazar(id: number) {
    if (!confirm("¿Rechazar este comprobante?")) return;
    setProcesandoId(id);
    try {
      await api.rechazarPagoDeposito(id);
      cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al rechazar el pago");
    } finally {
      setProcesandoId(null);
    }
  }

  const filters = [
    { value: "PENDIENTE", label: "Pendientes" },
    { value: "COMPLETADO", label: "Confirmados" },
    { value: "RECHAZADO", label: "Rechazados" },
    { value: "", label: "Todos" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Pagos con depósito</h1>
        <p className="text-slate-400 text-sm mt-1">
          Comprobantes de depósito bancario pendientes de confirmar
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                estadoFilter === f.value
                  ? "bg-[#0A2540] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
              <th className="px-6 py-3 font-medium">Alumno</th>
              <th className="px-6 py-3 font-medium">Plan</th>
              <th className="px-6 py-3 font-medium">Monto</th>
              <th className="px-6 py-3 font-medium">Mes pagado</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium">Comprobante</th>
              <th className="px-6 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && pagos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  No hay pagos en este filtro
                </td>
              </tr>
            )}
            {!loading &&
              pagos.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#0A2540]">
                      {p.alumno.nombre} {p.alumno.apellido}
                    </p>
                    <p className="text-xs text-slate-400">{p.alumno.carnet}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.plan}</td>
                  <td className="px-6 py-4 font-semibold text-[#0A2540]">
                    {formatearMonto(p.montoCentavos, p.moneda)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.mesPagado ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ESTADO_STYLES[p.estado] ?? ""}`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.comprobanteUrl ? (
                      <a
                        href={p.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#00C4B4] hover:underline text-xs font-semibold"
                      >
                        Ver boleta <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">Sin subir</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.estado === "PENDIENTE" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => confirmar(p.id)}
                          disabled={procesandoId === p.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => rechazar(p.id)}
                          disabled={procesandoId === p.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
