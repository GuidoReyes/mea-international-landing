# Task ID: 144

**Title:** Create frontend constant and utilities for bank account display

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Add lib/pago-deposito.ts with hardcoded bank account information constants and helper utilities

**Details:**

Create lib/pago-deposito.ts:

export const CUENTA_DEPOSITO = {
  banco: 'Banco Industrial',
  nombreCuenta: 'Corporacion ME',
  tipoCuenta: 'Cuenta monetaria BI',
  numeroCuenta: 'GTQ-6930015505',
} as const;

export function formatearMes(mes: string): string {
  // Convert 'YYYY-MM' to readable format like 'Julio 2026'
  const [year, month] = mes.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[parseInt(month, 10) - 1]} ${year}`;
}

export function getMesActual(): string {
  // Returns current month in 'YYYY-MM' format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

Validation: TypeScript compiles without errors, constants match PRD specification exactly

**Test Strategy:**

Unit tests: (1) CUENTA_DEPOSITO has all 4 required fields with exact values from PRD, (2) formatearMes('2026-07') returns 'Julio 2026', (3) getMesActual() returns valid YYYY-MM format matching current date
