import { spawn } from "child_process";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { log } from "./logger";

// True si PIPER_VOICE_PATH está seteado y el archivo de voz existe en disco.
export function isPiperConfigurado(): boolean {
  const vozPath = process.env.PIPER_VOICE_PATH;
  return !!vozPath && existsSync(vozPath);
}

// Sintetiza `texto` a un WAV usando el binario `piper` (asumido en PATH) y
// devuelve el audio como Buffer. Lanza si Piper no está configurado o falla.
export async function sintetizarAudioPiper(texto: string): Promise<Buffer> {
  const vozPath = process.env.PIPER_VOICE_PATH;
  if (!vozPath || !existsSync(vozPath)) {
    throw new Error("Piper no está configurado: falta PIPER_VOICE_PATH o el archivo de voz no existe");
  }

  const outputPath = path.join(os.tmpdir(), `piper-tts-${randomUUID()}.wav`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("piper", ["-m", vozPath, "-f", outputPath]);
    let stderr = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      reject(new Error(`No se pudo ejecutar piper: ${err.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`piper terminó con código ${code}: ${stderr}`));
        return;
      }
      resolve();
    });

    proc.stdin.write(texto);
    proc.stdin.end();
  });

  try {
    const buffer = await readFile(outputPath);
    return buffer;
  } finally {
    await unlink(outputPath).catch((err) => {
      log("warn", `[PiperTTS] No se pudo borrar el temporal ${outputPath}:`, err);
    });
  }
}

// Limpieza simple de texto antes de sintetizar: quita markdown, emojis y
// símbolos no pronunciables, y colapsa espacios. Referencia conceptual:
// jarvis-gt (panel/tts.py) usa un pre-procesado equivalente antes de Piper.
export function limpiarTextoParaVoz(texto: string): string {
  if (!texto) return "";

  let t = texto;
  t = t.replace(/```[\s\S]*?```/g, " ");            // bloques de código
  t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");       // imágenes markdown
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");     // [texto](url) → texto
  t = t.replace(/https?:\/\/\S+/g, " ");             // URLs sueltas
  t = t.replace(/`([^`]*)`/g, "$1");                 // código inline
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");          // encabezados
  t = t.replace(/^\s*>\s?/gm, "");                   // blockquotes
  t = t.replace(/^\s*[-*+]\s+/gm, "");                // viñetas

  // Deja solo letras/números/espacio + puntuación que ayuda a hablar.
  const speakPunct = new Set(" .,;:¿?¡!()\"'-\n");
  let filtered = "";
  for (const ch of t) {
    if (/[\p{L}\p{N}]/u.test(ch) || speakPunct.has(ch)) {
      filtered += ch;
    } else if (/\s/.test(ch)) {
      filtered += " ";
    }
  }
  t = filtered;

  t = t.replace(/\s*\n+\s*/g, ". ");   // saltos de línea → pausa
  t = t.replace(/[ \t]+/g, " ");        // colapsar espacios
  t = t.replace(/\s+([.,;:!?])/g, "$1"); // espacio antes de puntuación
  t = t.replace(/([.,;:]){2,}/g, "$1");  // puntuación repetida

  return t.trim();
}
