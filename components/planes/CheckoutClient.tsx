"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Upload, MessageCircle } from "lucide-react";
import {
  PlanPublico,
  PlanPrecioPublico,
  formatearPrecioCentavos,
  buildCheckoutWhatsAppUrl,
} from "@/lib/cursos-online";
import { CUENTA_DEPOSITO, mesActualISO } from "@/lib/pago-deposito";
import { alumnoApi, getAlumnoToken, type CuentaDeposito } from "@/lib/alumno-api";

interface Props {
  plan: PlanPublico;
  precio: PlanPrecioPublico;
}

type Paso = "resumen" | "deposito" | "confirmado";

function CopiarBoton({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      onClick={copiar}
      className="inline-flex items-center gap-1 text-xs text-[#00C4B4] hover:underline"
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function CheckoutClient({ plan, precio }: Props) {
  const [paso, setPaso] = useState<Paso>("resumen");
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<CuentaDeposito>(CUENTA_DEPOSITO);
  const [pagoId, setPagoId] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mesPagado, setMesPagado] = useState(mesActualISO());

  const precioMes = formatearPrecioCentavos(precio.precioMesCentavos, precio.moneda);
  const total = formatearPrecioCentavos(precio.precioTotalCentavos, precio.moneda);
  const whatsappUrl = buildCheckoutWhatsAppUrl(plan.nombre, precio.duracionMeses, precioMes);
  const tieneSesion = getAlumnoToken() !== null;

  async function handleIniciarDeposito() {
    setProcesando(true);
    setAviso(null);
    try {
      const resultado = await alumnoApi.checkoutManual(precio.id);
      setCuenta(resultado.cuenta);
      setPagoId(resultado.pagoId);
      setPaso("deposito");
    } catch (err) {
      setAviso(
        err instanceof Error ? err.message : "No se pudo iniciar el pago. Intentá de nuevo."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function handleEnviarComprobante() {
    if (!archivo || !pagoId) return;
    setProcesando(true);
    setAviso(null);
    try {
      await alumnoApi.subirComprobante(pagoId, archivo, mesPagado);
      setPaso("confirmado");
    } catch (err) {
      setAviso(
        err instanceof Error ? err.message : "No se pudo subir el comprobante. Intentá de nuevo."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
      <h2 className="text-xl font-bold text-[#0A2540] mb-1">Plan {plan.nombre}</h2>
      <p className="text-sm text-slate-500 mb-6">{plan.descripcion}</p>

      <div className="bg-slate-50 rounded-xl p-6 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Duración</span>
          <span className="font-semibold text-[#0A2540]">
            {precio.duracionMeses} {precio.duracionMeses === 1 ? "mes" : "meses"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Precio por mes</span>
          <span className="font-semibold text-[#0A2540]">{precioMes}</span>
        </div>
        {precio.ahorroPorcentaje > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Descuento</span>
            <span className="font-semibold text-[#00C4B4]">-{precio.ahorroPorcentaje}%</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-slate-200">
          <span className="font-bold text-[#0A2540]">Total</span>
          <span className="font-bold text-[#0A2540]">{total}</span>
        </div>
      </div>

      {aviso && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-4">{aviso}</p>
      )}

      {paso === "resumen" && (
        <div className="space-y-3">
          {tieneSesion ? (
            <button
              onClick={handleIniciarDeposito}
              disabled={procesando}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all disabled:opacity-50"
            >
              {procesando ? "Generando datos de depósito..." : "Pagar por depósito bancario"}
            </button>
          ) : (
            <Link
              href="/alumno/login"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#0A2540] text-white rounded-full font-bold hover:bg-[#0d2f4f] transition-all"
            >
              Iniciar sesión para continuar
            </Link>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-[#00C4B4] text-[#00C4B4] rounded-full font-bold hover:bg-[#00C4B4]/5 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Coordinar por WhatsApp
          </a>
        </div>
      )}

      {paso === "deposito" && (
        <div className="space-y-5">
          <div className="bg-[#0A2540] rounded-xl p-5 text-white space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
              Datos para tu depósito
            </p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">Banco</span>
              <span className="font-semibold">{cuenta.banco}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">Nombre de cuenta</span>
              <span className="font-semibold">{cuenta.nombreCuenta}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">Tipo de cuenta</span>
              <span className="font-semibold">{cuenta.tipoCuenta}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">Número de cuenta</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{cuenta.numeroCuenta}</span>
                <CopiarBoton valor={cuenta.numeroCuenta} />
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
              <span className="text-slate-300">Monto a depositar</span>
              <span className="font-bold text-[#00C4B4]">{total}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
              Mes que cubre este pago
            </label>
            <input
              type="month"
              value={mesPagado}
              onChange={(e) => setMesPagado(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
              Foto o PDF de la boleta de depósito
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#00C4B4]/10 file:text-[#00C4B4] file:font-semibold"
            />
          </div>

          <button
            onClick={handleEnviarComprobante}
            disabled={procesando || !archivo}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#00C4B4] text-white rounded-full font-bold hover:bg-[#00a898] transition-all disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            {procesando ? "Enviando..." : "Enviar comprobante"}
          </button>
        </div>
      )}

      {paso === "confirmado" && (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-[#00C4B4]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-[#00C4B4]" />
          </div>
          <h3 className="text-lg font-bold text-[#0A2540] mb-1">¡Comprobante recibido!</h3>
          <p className="text-sm text-slate-500">
            Nuestro equipo va a confirmar tu depósito en las próximas horas y tu plan quedará
            activo automáticamente.
          </p>
        </div>
      )}

      {paso !== "confirmado" && (
        <p className="text-xs text-slate-400 text-center mt-4">
          El pago se hace por depósito bancario. También podés coordinar por WhatsApp si preferís.
        </p>
      )}
    </div>
  );
}
