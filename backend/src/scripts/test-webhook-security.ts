/**
 * Pruebas de seguridad de webhooks (tarea 481): firma de Twilio, rawBody y teléfonos.
 * Uso: node -r ts-node/register/transpile-only src/scripts/test-webhook-security.ts
 */
import assert from "node:assert/strict";
import twilio from "twilio";
import type { Request, Response } from "express";
import { verifyTwilioSignature } from "../middleware/twilio-webhook.middleware";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} (${err instanceof Error ? err.message.split("\n")[0] : String(err)})`);
  }
}

interface Outcome {
  readonly passed: boolean;
  readonly status: number | null;
}

function runMiddleware(
  middleware: (req: Request, res: Response, next: () => void) => void,
  req: Record<string, unknown>
): Outcome {
  let passed = false;
  let status: number | null = null;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  const warn = console.warn;
  console.warn = () => undefined; // los avisos de log() ensucian la salida de la prueba
  try {
    middleware(req as unknown as Request, res, () => {
      passed = true;
    });
  } finally {
    console.warn = warn;
  }
  return { passed, status };
}

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const previous = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const AUTH_TOKEN = "twilio-test-token";
const URL_PATH = "/api/twilio/webhook";
const BODY = { From: "whatsapp:+50212345678", Body: "hola" };

function twilioRequest(signature?: string): Record<string, unknown> {
  return {
    headers: {
      host: "example.com",
      "x-forwarded-proto": "https",
      ...(signature ? { "x-twilio-signature": signature } : {}),
    },
    protocol: "https",
    originalUrl: URL_PATH,
    body: BODY,
  };
}

const validSignature = twilio.getExpectedTwilioSignature(AUTH_TOKEN, `https://example.com${URL_PATH}`, BODY);

check("Twilio: sin TWILIO_AUTH_TOKEN en producción falla cerrado (500)", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: undefined, NODE_ENV: "production" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest())
  );
  assert.equal(out.passed, false);
  assert.equal(out.status, 500);
});

check("Twilio: sin TWILIO_AUTH_TOKEN y NODE_ENV sin definir falla cerrado", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: undefined, NODE_ENV: undefined }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest())
  );
  assert.equal(out.passed, false);
  assert.equal(out.status, 500);
});

check("Twilio: sin TWILIO_AUTH_TOKEN en development se omite la verificación", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: undefined, NODE_ENV: "development" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest())
  );
  assert.equal(out.passed, true);
});

check("Twilio: sin TWILIO_AUTH_TOKEN en test se omite la verificación", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: undefined, NODE_ENV: "test" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest())
  );
  assert.equal(out.passed, true);
});

check("Twilio: sin cabecera de firma -> 403", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: AUTH_TOKEN, NODE_ENV: "production" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest())
  );
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("Twilio: firma inválida -> 403", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: AUTH_TOKEN, NODE_ENV: "production" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest("firma-falsa"))
  );
  assert.equal(out.passed, false);
  assert.equal(out.status, 403);
});

check("Twilio: firma válida pasa", () => {
  const out = withEnv({ TWILIO_AUTH_TOKEN: AUTH_TOKEN, NODE_ENV: "production" }, () =>
    runMiddleware(verifyTwilioSignature, twilioRequest(validSignature))
  );
  assert.equal(out.passed, true);
});

/* eslint-disable @typescript-eslint/no-require-imports */
check("requireRawBody: rawBody ausente -> 400", () => {
  const { requireRawBody } = require("../middleware/raw-body.middleware");
  const out = runMiddleware(requireRawBody, { headers: {} });
  assert.equal(out.passed, false);
  assert.equal(out.status, 400);
});

check("requireRawBody: rawBody vacío -> 400", () => {
  const { requireRawBody } = require("../middleware/raw-body.middleware");
  const out = runMiddleware(requireRawBody, { headers: {}, rawBody: "" });
  assert.equal(out.passed, false);
  assert.equal(out.status, 400);
});

check("requireRawBody: con cuerpo pasa", () => {
  const { requireRawBody } = require("../middleware/raw-body.middleware");
  const out = runMiddleware(requireRawBody, { headers: {}, rawBody: '{"a":1}' });
  assert.equal(out.passed, true);
});

check("normalizePhone deja solo dígitos", () => {
  const { normalizePhone } = require("../lib/phone-utils");
  assert.equal(normalizePhone("+50512345678"), "50512345678");
  assert.equal(normalizePhone("50512345678"), "50512345678");
  assert.equal(normalizePhone("whatsapp:+502 1234-5678"), "50212345678");
  assert.equal(normalizePhone(""), "");
});

check("isSamePhone acepta formatos distintos del mismo número", () => {
  const { isSamePhone } = require("../lib/phone-utils");
  assert.equal(isSamePhone("whatsapp:+50212345678", "+50212345678"), true);
  assert.equal(isSamePhone("whatsapp:+50212345678", "50212345678"), true);
});

check("isSamePhone rechaza otro número y falla cerrado si falta el admin", () => {
  const { isSamePhone } = require("../lib/phone-utils");
  assert.equal(isSamePhone("whatsapp:+50299999999", "+50212345678"), false);
  assert.equal(isSamePhone("whatsapp:+50212345678", undefined), false);
  assert.equal(isSamePhone("whatsapp:+50212345678", ""), false);
  assert.equal(isSamePhone("", ""), false);
});

if (failures > 0) {
  console.log(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron");
