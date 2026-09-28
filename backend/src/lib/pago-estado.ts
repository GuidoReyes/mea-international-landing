import type { PagoEstado } from "@prisma/client";

// Un pago COMPLETADO no debe poder sobrescribirse con otro comprobante y uno
// REEMBOLSADO ya se devolvió. PENDIENTE, RECHAZADO (el alumno corrige la boleta)
// y VENCIDO (paga tarde) siguen abiertos.
const ESTADOS_CERRADOS: readonly PagoEstado[] = ["COMPLETADO", "REEMBOLSADO"];

export function puedeSubirComprobante(estado: PagoEstado): boolean {
  return !ESTADOS_CERRADOS.includes(estado);
}
