/**
 * Pruebas de validación de entradas y subidas (tarea 484).
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-input-validation.ts
 */
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { urlZoomSchema } from "../routes/clases-en-vivo";
import { ESTADOS_INSCRIPCION_VALIDOS, isEstadoInscripcionValido } from "../routes/inscripciones";
import { validateUpload, MIME_TO_EXT } from "../lib/upload-utils";
import { parseDateFilter } from "../lib/date-utils";
import { escapeCsv } from "../routes/leads";
import { errorHandler } from "../middleware/error.middleware";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.replace(/\s+/g, " ") : String(err)})`);
  }
}

// ── vuln_015: urlZoom ─────────────────────────────────────────────────────────

check("urlZoom: acepta una URL https de zoom.us", () => {
  assert.equal(urlZoomSchema.safeParse("https://zoom.us/j/123456789").success, true);
  assert.equal(urlZoomSchema.safeParse("https://mea.zoom.us/j/123456789?pwd=abc").success, true);
});

check("urlZoom: rechaza un dominio que no es Zoom", () => {
  assert.equal(urlZoomSchema.safeParse("https://evil.com/j/123456789").success, false);
});

check("urlZoom: rechaza http (no https)", () => {
  assert.equal(urlZoomSchema.safeParse("http://zoom.us/j/123456789").success, false);
});

check("urlZoom: rechaza un dominio que contiene 'zoom.us' como subcadena engañosa", () => {
  // "zoom.us" no debe aparecer solo en el path/query de otro host
  assert.equal(urlZoomSchema.safeParse("https://evil.com/zoom.us").success, false);
});

check("urlZoom: rechaza texto que no es URL", () => {
  assert.equal(urlZoomSchema.safeParse("no-es-una-url").success, false);
});

// ── vuln_023: estado de inscripciones ─────────────────────────────────────────

check("isEstadoInscripcionValido acepta los 4 estados válidos", () => {
  for (const e of ESTADOS_INSCRIPCION_VALIDOS) assert.equal(isEstadoInscripcionValido(e), true);
});

check("isEstadoInscripcionValido rechaza valores fuera de la lista", () => {
  assert.equal(isEstadoInscripcionValido("BORRADA"), false);
  assert.equal(isEstadoInscripcionValido("activa"), false); // sensible a mayúsculas, como el enum de Prisma
  assert.equal(isEstadoInscripcionValido(""), false);
  assert.equal(isEstadoInscripcionValido(undefined), false);
});

// ── vuln_026 + vuln_032: subida de archivos por MIME, no por nombre ──────────

check("validateUpload acepta un MIME permitido y deriva la extensión del MIME", () => {
  const file = { mimetype: "image/png", originalname: "boleta.exe" } as Express.Multer.File;
  const out = validateUpload(file, ["image/png", "image/jpeg", "application/pdf"]);
  assert.equal(out.valid, true);
  assert.equal(out.extension, "png"); // NUNCA "exe", aunque el nombre lo diga
});

check("validateUpload rechaza un MIME fuera de la lista permitida", () => {
  const file = { mimetype: "application/x-msdownload", originalname: "boleta.png" } as Express.Multer.File;
  const out = validateUpload(file, ["image/png", "image/jpeg", "application/pdf"]);
  assert.equal(out.valid, false);
  assert.ok(out.error);
});

check("validateUpload: un .exe con Content-Type falsificado como image/png igual se acepta como png", () => {
  // Esto es una limitación conocida: file.mimetype lo declara el cliente, no se
  // inspeccionan los bytes reales. La mejora real es no confiar en el NOMBRE
  // del archivo para la extensión (que es lo que pedía vuln_026/vuln_032).
  const file = { mimetype: "image/png", originalname: "malware.exe" } as Express.Multer.File;
  assert.equal(validateUpload(file, ["image/png"]).extension, "png");
});

check("MIME_TO_EXT cubre los tipos usados por comprobantes e importaciones CSV", () => {
  for (const mime of ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv"]) {
    assert.ok(MIME_TO_EXT[mime], `falta ${mime}`);
  }
});

// ── vuln_029: fechas de filtro ────────────────────────────────────────────────

check("parseDateFilter acepta una fecha ISO válida", () => {
  const out = parseDateFilter("2026-01-15");
  assert.equal(out.valid, true);
  assert.ok(out.date instanceof Date);
});

check("parseDateFilter rechaza 'abc' en vez de devolver Invalid Date", () => {
  const out = parseDateFilter("abc");
  assert.equal(out.valid, false);
});

check("parseDateFilter rechaza cadenas vacías y valores no-fecha con apariencia numérica", () => {
  assert.equal(parseDateFilter("").valid, false);
  assert.equal(parseDateFilter("99999999999999999999").valid, false);
});

check("parseDateFilter: undefined es válido (filtro ausente, no un error)", () => {
  assert.equal(parseDateFilter(undefined).valid, true);
  assert.equal(parseDateFilter(undefined).date, undefined);
});

// ── vuln_022: inyección de fórmulas en CSV ────────────────────────────────────

check("escapeCsv antepone comilla a valores que empiezan con = + - @", () => {
  assert.equal(escapeCsv("=cmd|'/c calc'!A1"), "'=cmd|'/c calc'!A1");
  assert.equal(escapeCsv("+1+1"), "'+1+1");
  assert.equal(escapeCsv("-1+1"), "'-1+1");
  assert.equal(escapeCsv("@SUM(A1)"), "'@SUM(A1)");
});

check("escapeCsv antepone comilla ante tab o retorno de carro al inicio", () => {
  assert.equal(escapeCsv("\t=1+1"), "'\t=1+1");
  assert.equal(escapeCsv("\r=1+1"), "'\r=1+1");
});

check("escapeCsv sigue escapando comas, comillas y saltos de línea como antes", () => {
  assert.equal(escapeCsv("a,b"), '"a,b"');
  assert.equal(escapeCsv('a"b'), '"a""b"');
  assert.equal(escapeCsv("a\nb"), '"a\nb"');
});

check("escapeCsv no altera texto normal", () => {
  assert.equal(escapeCsv("Juan Pérez"), "Juan Pérez");
  assert.equal(escapeCsv(42), "42");
  assert.equal(escapeCsv(null), "");
});

check("escapeCsv: fórmula + coma combina ambas defensas", () => {
  assert.equal(escapeCsv("=A1,B1"), "\"'=A1,B1\"");
});

// ── vuln_024: middleware central de errores ──────────────────────────────────

function mockRes(): { res: Response; state: { status: number | null; body: unknown } } {
  const state: { status: number | null; body: unknown } = { status: null, body: undefined };
  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  };
  return { res: res as unknown as Response, state };
}

check("errorHandler: responde JSON 500 sin stack en producción", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const { res, state } = mockRes();
  errorHandler(new Error("boom interno con detalle sensible"), {} as Request, res, (() => {}) as NextFunction);
  process.env.NODE_ENV = previous;
  assert.equal(state.status, 500);
  const body = state.body as Record<string, unknown>;
  assert.equal("stack" in body, false);
  assert.equal(JSON.stringify(body).includes("sensible"), false);
});

check("errorHandler: incluye stack fuera de producción", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const { res, state } = mockRes();
  errorHandler(new Error("boom"), {} as Request, res, (() => {}) as NextFunction);
  process.env.NODE_ENV = previous;
  const body = state.body as Record<string, unknown>;
  assert.equal(typeof body.stack, "string");
});

check("errorHandler: respeta err.status cuando el error lo trae", () => {
  const err = Object.assign(new Error("no encontrado"), { status: 404 });
  const { res, state } = mockRes();
  errorHandler(err, {} as Request, res, (() => {}) as NextFunction);
  assert.equal(state.status, 404);
});

check("errorHandler: un error no-Error (string, objeto) no revienta el handler", () => {
  const { res, state } = mockRes();
  errorHandler("texto plano" as unknown as Error, {} as Request, res, (() => {}) as NextFunction);
  assert.equal(state.status, 500);
  assert.ok((state.body as Record<string, unknown>).error);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
// Salida forzada: algunas rutas importadas arrastran el cliente de Redis (lib/redis.ts),
// cuyo reconnectStrategy reintenta sin límite si Redis no está corriendo — eso mantiene
// vivo el proceso y el script nunca termina por sí solo.
process.exit(0);
