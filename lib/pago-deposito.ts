// Datos de la cuenta bancaria para el flujo de pago manual por depósito.
// Fallback local — el backend también los devuelve en POST /suscripciones/checkout-manual.

export const CUENTA_DEPOSITO = {
  banco: "Banco Industrial",
  nombreCuenta: "Corporacion ME",
  tipoCuenta: "Cuenta monetaria BI",
  numeroCuenta: "GTQ-6930015505",
};

export function mesActualISO(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}
