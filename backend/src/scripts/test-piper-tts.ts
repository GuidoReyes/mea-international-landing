import assert from "assert";
import {
  isPiperConfigurado,
  sintetizarAudioPiper,
  limpiarTextoParaVoz,
} from "../lib/piper-tts";

// ─── limpiarTextoParaVoz ─────────────────────────────────────────────────────

const conMarkdown = "# Título\n\nEsto es **negrita** y `código inline` con un [link](https://ejemplo.com) 🎉 y ✅ listo.";
const limpio = limpiarTextoParaVoz(conMarkdown);
assert.ok(!limpio.includes("#"), "no debe quedar # de encabezado");
assert.ok(!limpio.includes("`"), "no debe quedar backtick");
assert.ok(!limpio.includes("["), "no debe quedar sintaxis de link markdown");
assert.ok(!limpio.includes("https://"), "no debe quedar URL");
assert.ok(!limpio.includes("🎉") && !limpio.includes("✅"), "no deben quedar emojis");
assert.ok(limpio.includes("Título") && limpio.includes("negrita") && limpio.includes("código inline"));

const textoPlano = "Hola, esto es una oración normal. ¿Cómo estás?";
assert.strictEqual(limpiarTextoParaVoz(textoPlano), textoPlano, "texto plano debe quedar intacto");

assert.strictEqual(limpiarTextoParaVoz(""), "");

console.log("✓ limpiarTextoParaVoz: 3 casos OK (markdown fuera, texto plano intacto, vacío)");

// ─── sintetizarAudioPiper ────────────────────────────────────────────────────

async function main() {
  if (!isPiperConfigurado()) {
    console.log("⚠ Piper no configurado (PIPER_VOICE_PATH no seteado o archivo inexistente) — se omite síntesis real.");
    console.log("Todos los tests de piper-tts pasaron (con síntesis omitida).");
    return;
  }

  const buffer = await sintetizarAudioPiper("Hello world");
  assert.ok(buffer.length > 1000, "el WAV sintetizado debe tener un tamaño razonable");
  assert.strictEqual(buffer.subarray(0, 4).toString("ascii"), "RIFF", "debe tener header RIFF de WAV");

  console.log("✓ sintetizarAudioPiper: WAV generado correctamente (RIFF, tamaño OK)");
  console.log("Todos los tests de piper-tts pasaron.");
}

main().catch((err) => {
  console.error("✗ test-piper-tts falló:", err);
  process.exit(1);
});
