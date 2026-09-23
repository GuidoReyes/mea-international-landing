/**
 * Pruebas de XSS en el email del agente de seguridad (tarea #496, ronda 2).
 * buildHtml se exporta desde emailer.ts (igual que dashboardPage/loginHandler
 * en security.routes.ts, tarea #477) para poder probarlo sin mockear el envío.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-emailer-xss.ts
 */
import assert from "node:assert/strict";
import { escHtml } from "../lib/html-escape";
import { buildHtml } from "../security-agent/emailer";
import type { ScanResult, Vulnerability } from "../security-agent/types";

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

// ── escHtml() ────────────────────────────────────────────────────────────────

check("escHtml neutraliza <img onerror=...>", () => {
  const out = escHtml('<img src=x onerror=alert(1)>');
  assert.equal(out.includes("<img"), false);
  assert.ok(out.includes("&lt;img"));
});

check("escHtml escapa comillas dobles y simples (rompen atributos HTML)", () => {
  assert.equal(escHtml(`"onmouseover="alert(1)`), "&quot;onmouseover=&quot;alert(1)");
  assert.equal(escHtml("O'Brien"), "O&#39;Brien");
});

check("escHtml escapa & antes que el resto (evita doble-decodificación)", () => {
  assert.equal(escHtml("Tom & <b>Jerry</b>"), "Tom &amp; &lt;b&gt;Jerry&lt;/b&gt;");
});

check("escHtml maneja valores no-string sin lanzar", () => {
  assert.equal(escHtml(null as unknown as string), "");
  assert.equal(escHtml(undefined as unknown as string), "");
});

// ── buildHtml ──────────────────────────────────────────────────────────────

const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

function makeVuln(overrides: Partial<Vulnerability> = {}): Vulnerability {
  return {
    id: "vuln_001",
    title: "título normal",
    severity: "HIGH",
    file: "src/a.ts",
    line: 1,
    code_snippet: "",
    description: "",
    attack_scenario: "",
    business_impact: "",
    owasp_reference: "",
    fix_guide: { steps: [], code_before: "", code_after: "", difficulty: "EASY", estimated_time: "" },
    resolved: false,
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scan_id: "abc12345-6789-4abc-8def-123456789012",
    timestamp: "2026-09-22T00:00:00.000Z",
    project_name: "test",
    files_scanned: 10,
    security_score: 42,
    scan_summary: "resumen normal",
    status: "COMPLETED",
    duration_ms: 1000,
    vulnerabilities: [],
    ...overrides,
  };
}

check("buildHtml escapa el título de una vulnerabilidad con payload XSS", () => {
  const html = buildHtml(makeScanResult({ vulnerabilities: [makeVuln({ title: XSS_PAYLOAD })] }));
  assert.equal(html.includes(XSS_PAYLOAD), false);
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

check("buildHtml escapa el file:line de una vulnerabilidad con payload XSS", () => {
  const html = buildHtml(makeScanResult({ vulnerabilities: [makeVuln({ file: XSS_PAYLOAD })] }));
  assert.equal(html.includes(XSS_PAYLOAD), false);
});

check("buildHtml escapa scan_summary con payload de script", () => {
  const html = buildHtml(makeScanResult({ scan_summary: "<script>alert(2)</script>" }));
  assert.equal(/<script>alert\(2\)<\/script>/i.test(html), false);
});

check("buildHtml no altera texto normal (título, resumen)", () => {
  const html = buildHtml(makeScanResult({ scan_summary: "Todo en orden" }));
  assert.ok(html.includes("Todo en orden"));
});

check("buildHtml: security_score no numérico no rompe el render (se trata como 0)", () => {
  const html = buildHtml(makeScanResult({ security_score: "<b>x</b>" as unknown as number }));
  assert.equal(html.includes("<b>x</b>"), false);
});

check("buildHtml: severity inesperada no rompe el color condicional", () => {
  const html = buildHtml(
    makeScanResult({ vulnerabilities: [makeVuln({ severity: '"><script>alert(3)</script>' as never })] })
  );
  assert.equal(/<script>alert\(3\)<\/script>/i.test(html), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
