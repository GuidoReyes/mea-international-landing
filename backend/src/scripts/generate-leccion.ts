/**
 * Genera el contenido interactivo (LessonPlayer) de una Leccion vía Claude,
 * lo valida contra leccionContenidoSchema, sintetiza audio con Piper para el
 * vocabulario nuevo y las frases de "escuchar", sube ese audio a R2, y guarda
 * el resultado en Leccion.content.
 *
 * Uso:
 *   npx ts-node src/scripts/generate-leccion.ts <leccionId> "<tema>" [--dry-run]
 *
 * --dry-run: genera y valida el JSON pero NO sintetiza audio ni guarda nada
 * (solo lo imprime). Útil para el orquestador antes de correrlo contra la BD real.
 */
import Anthropic from "@anthropic-ai/sdk";
import prisma from "../lib/prisma";
import { leccionContenidoSchema, LeccionContenido, PasoLeccion } from "../lib/leccion-contenido.schema";
import { isPiperConfigurado, sintetizarAudioPiper, limpiarTextoParaVoz } from "../lib/piper-tts";
import { subirArchivoR2 } from "../lib/storage";
import { isGeminiConfigurado } from "../lib/gemini-image";
import { resolverImagenVocabulario } from "../lib/imagen-vocabulario";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;
const MIN_PASOS = 8;
const MAX_PASOS = 12;
const PLACEHOLDER_AUDIO_URL = "https://pending.local/audio-placeholder.wav";

interface Args {
  leccionId: number;
  tema: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const dryRun = argv.includes("--dry-run");
  const [leccionIdRaw, tema] = argv.filter((a) => a !== "--dry-run");

  const leccionId = Number(leccionIdRaw);
  if (!leccionIdRaw || !Number.isInteger(leccionId) || leccionId <= 0) {
    console.error('Uso: npx ts-node src/scripts/generate-leccion.ts <leccionId> "<tema>" [--dry-run]');
    process.exit(1);
  }
  if (!tema || !tema.trim()) {
    console.error("Falta el <tema> de la lección.");
    process.exit(1);
  }

  return { leccionId, tema: tema.trim(), dryRun };
}

function construirPrompt(tema: string): string {
  return `Generá el contenido interactivo de una lección de inglés estilo Duolingo sobre el tema: "${tema}".

Devolvé SOLO JSON válido (sin \`\`\`json ni texto adicional, sin comentarios) con esta forma exacta (LeccionContenido):

{
  "version": 1,
  "pasos": [ ... entre ${MIN_PASOS} y ${MAX_PASOS} pasos, mezclando los tipos siguientes ... ]
}

Cada paso tiene un campo base "id" (string único no vacío) y "tipo" (uno de los 7 siguientes). Los tipos y sus campos EXACTOS son:

1. tipo: "vocabulario"
   - palabra: string (la palabra o frase en inglés)
   - traduccion: string (traducción al español)
   - imagenUrl?: opcional, string url — omitilo, no lo inventes
   - imagenBusqueda: string REQUERIDO — frase corta en inglés (2-5 palabras) que
     describa una FOTO REAL de una persona/escena ilustrando la palabra (ej. para
     "Hello" → "person waving hello greeting"; para "Good morning" → "woman
     drinking morning coffee"). Se usa después para buscar una foto real — no es
     texto decorativo, tiene que describir algo fotografiable.
   - audioUrl?: opcional, string url — omitilo por completo, se genera después

2. tipo: "opcion_multiple"
   - pregunta: string
   - opciones: string[] (entre 2 y 6 opciones)
   - respuestaCorrecta: number (índice 0-based de la opción correcta en "opciones")

3. tipo: "completar"
   - textoAntes: string (texto antes del espacio en blanco)
   - textoDespues: string (texto después del espacio en blanco; puede ser "")
   - respuestaCorrecta: string (la palabra/frase que completa el espacio)
   - opciones?: opcional, string[] (entre 2 y 6 — banco de palabras si aplica)

4. tipo: "ordenar"
   - instruccion: string
   - fraseCorrecta: string REQUERIDO — escribí PRIMERO la frase completa y
     gramaticalmente correcta en inglés que el ejercicio va a armar (ej. "How
     many in your party?"). Esto es lo que el alumno debe terminar formando.
   - palabras: string[] (mínimo 2) — la tokenización EXACTA de "fraseCorrecta"
     en piezas, desordenadas. NO agregues ni quites ninguna palabra respecto a
     "fraseCorrecta" (nada de piezas extra tipo "are" que no estén en la frase
     que escribiste, ni piezas faltantes) — cada palabra de "fraseCorrecta"
     debe aparecer una vez en "palabras", ni una más.
   - ordenCorrecto: number[] (índices 0-based) — al aplicar estos índices sobre
     "palabras" (palabras[ordenCorrecto[0]], palabras[ordenCorrecto[1]], ...)
     el resultado unido con espacios debe ser EXACTAMENTE "fraseCorrecta". Esto
     se verifica automáticamente — si no coincide, el intento se rechaza.
   - CRÍTICO: "palabras" contiene ÚNICAMENTE las piezas de "fraseCorrecta", en
     cualquier orden — SIN palabras señuelo/distractoras que no formen parte de
     la respuesta. El alumno coloca TODAS las piezas para verificar, así que
     ninguna puede sobrar ni faltar.

5. tipo: "emparejar"
   - instruccion: string
   - pares: array de { izquierda: string, derecha: string } (mínimo 2 pares, ej. inglés-español)

6. tipo: "escuchar"
   - audioUrl: string url, REQUERIDO — poné EXACTAMENTE el placeholder "${PLACEHOLDER_AUDIO_URL}" (se reemplaza después con el audio real)
   - opciones: string[] (entre 2 y 6 opciones de texto)
   - respuestaCorrecta: number (índice 0-based de la opción que coincide con lo que se "escucha")

7. tipo: "speak-check" (práctica de pronunciación, OPCIONAL — incluí 0 a 2 por lección)
   - target: string, REQUERIDO — DEBE ser exactamente la misma palabra/frase de un
     paso "vocabulario" o "escuchar" YA introducido ANTES en el array "pasos" (no
     inventes una palabra nueva acá, reusá una que el alumno ya vio).
   - lang?: opcional, string (ej. "en-US") — omitilo si no aplica.
   - imagenUrl?: opcional, string url — omitilo, no lo inventes.
   - Colocalo DESPUÉS del paso de vocabulario/escuchar cuyo texto reusa.

Reglas importantes:
- Usá los tipos disponibles, mezclados, en un orden pedagógico razonable (vocabulario nuevo primero, práctica después).
- Todo el contenido en inglés debe ser apropiado para el tema "${tema}".
- Los "id" de cada paso deben ser únicos dentro del array (ej: "paso-1", "paso-2", ...).
- NO incluyas el campo audioUrl en pasos que no sean "escuchar".
- En pasos de tipo "escuchar" SÍ incluí audioUrl con el placeholder exacto indicado arriba.
- Respondé ÚNICAMENTE con el JSON, nada de explicación, nada de markdown.`;
}

function extraerJSON(texto: string): string {
  const limpio = texto.trim();
  const fenceMatch = limpio.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const json = fenceMatch ? fenceMatch[1].trim() : limpio;
  // Claude a veces escribe `"campo":undefined` (JS válido, JSON inválido) en
  // vez de omitir directamente un campo opcional — bug real visto en
  // producción (crasheaba JSON.parse). undefined nunca es un valor JSON
  // legítimo, así que quitar la key entera equivale a omitirla. Dos pasadas
  // para no dejar una coma huérfana sin importar si la key está al
  // principio, en medio o al final del objeto.
  return json
    .replace(/"[a-zA-Z0-9_]+"\s*:\s*undefined\s*,\s*/g, "")
    .replace(/,\s*"[a-zA-Z0-9_]+"\s*:\s*undefined\s*/g, "")
    .replace(/"[a-zA-Z0-9_]+"\s*:\s*undefined\s*/g, "");
}

const MAX_INTENTOS_GENERACION = 3;

async function generarContenido(tema: string): Promise<LeccionContenido> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let ultimoErrorDetalle = "";

  for (let intento = 1; intento <= MAX_INTENTOS_GENERACION; intento++) {
    const prompt =
      intento === 1
        ? construirPrompt(tema)
        : `${construirPrompt(tema)}\n\nTu intento anterior falló esta validación — corregila:\n${ultimoErrorDetalle}`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const firstContent = response.content[0];
    if (!firstContent || firstContent.type !== "text") {
      throw new Error("Respuesta inesperada de Claude (sin contenido de texto)");
    }

    const jsonTexto = extraerJSON(firstContent.text);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonTexto);
    } catch (err) {
      console.error("La respuesta de Claude no es JSON válido:");
      console.error(jsonTexto);
      if (intento === MAX_INTENTOS_GENERACION) throw err instanceof Error ? err : new Error(String(err));
      ultimoErrorDetalle = "La respuesta no fue JSON válido. Respondé ÚNICAMENTE con el JSON.";
      continue;
    }

    const resultado = leccionContenidoSchema.safeParse(parsedJson);
    if (resultado.success) return resultado.data;

    const issues = resultado.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    console.error(`Intento ${intento}/${MAX_INTENTOS_GENERACION}: el contenido no cumple leccionContenidoSchema:`);
    for (const issue of issues) console.error(issue);

    if (intento === MAX_INTENTOS_GENERACION) {
      process.exit(1);
    }

    // Repetir solo el mensaje abstracto de Zod no alcanza: en producción
    // Claude repitió EXACTAMENTE el mismo error 3 veces seguidas en "ordenar"
    // porque nunca vio su propio paso fallido, solo la regla en abstracto.
    // Adjuntar el JSON crudo del/los paso(s) específicos que fallaron le da
    // algo concreto contra qué autocorregirse.
    const pasosFallidos = new Set(
      resultado.error.issues
        .map((i) => (typeof i.path[1] === "number" ? i.path[1] : undefined))
        .filter((i): i is number => i !== undefined)
    );
    const pasosArray = Array.isArray(parsedJson) ? undefined : (parsedJson as { pasos?: unknown[] })?.pasos;
    const pasosJSON = pasosArray
      ? [...pasosFallidos].map((i) => `  paso índice ${i}: ${JSON.stringify(pasosArray[i])}`).join("\n")
      : "";

    ultimoErrorDetalle = `${issues.join("\n")}${
      pasosJSON ? `\n\nEsto fue exactamente lo que generaste para el/los paso(s) que fallaron:\n${pasosJSON}\n\nCorregí ESE paso específico — no repitas el mismo error.` : ""
    }`;
  }

  throw new Error("inalcanzable");
}

function textoPronunciable(paso: PasoLeccion): string | undefined {
  if (paso.tipo === "vocabulario") return paso.palabra;
  if (paso.tipo === "escuchar") return paso.opciones[paso.respuestaCorrecta];
  // "ordenar": la frase correcta ensamblada — deja lista un audioUrl real
  // para el botón 🔊 que PasoOrdenarView muestra después de verificar.
  if (paso.tipo === "ordenar") return paso.fraseCorrecta;
  return undefined;
}

// ─── Imágenes de las tarjetas de vocabulario (librería propia en R2) ────────
// 100% generadas con IA (Gemini Interactions API) — nunca fotos de personas
// reales, sin riesgo de derechos de autor de terceros. resolverImagenVocabulario
// (imagen-vocabulario.ts) cachea por concepto: cada palabra se genera UNA
// sola vez y las lecciones futuras que la repitan reusan la misma imagen.
// Tolerante: sin GEMINI_API_KEY o si falla, el paso queda sin imagenUrl (la
// tarjeta ya soporta ese campo como opcional) en vez de romper el lote.

interface ResultadoImagenes {
  contenido: LeccionContenido;
  generadas: number;
  reusadas: number;
  saltadas: number;
}

async function generarImagenes(contenido: LeccionContenido): Promise<ResultadoImagenes> {
  const pasosConBusqueda = contenido.pasos.filter(
    (p): p is PasoLeccion & { tipo: "vocabulario"; imagenBusqueda: string } =>
      p.tipo === "vocabulario" && !!p.imagenBusqueda
  );

  if (!isGeminiConfigurado()) {
    if (pasosConBusqueda.length > 0) {
      console.warn(`GEMINI_API_KEY no configurada — se omite imagen para ${pasosConBusqueda.length} paso(s).`);
    }
    return { contenido, generadas: 0, reusadas: 0, saltadas: pasosConBusqueda.length };
  }

  let generadas = 0;
  let reusadas = 0;
  let saltadas = 0;
  const pasosActualizados: PasoLeccion[] = [];

  for (const paso of contenido.pasos) {
    if (paso.tipo !== "vocabulario" || !paso.imagenBusqueda) {
      pasosActualizados.push(paso);
      continue;
    }

    try {
      const resuelta = await resolverImagenVocabulario(paso.imagenBusqueda);
      if (!resuelta) {
        console.warn(`No se pudo resolver imagen para el paso ${paso.id} (R2 no configurado o falló) — continúa sin imagen.`);
        saltadas += 1;
        pasosActualizados.push(paso);
        continue;
      }

      const etiqueta = resuelta.fuente === "cache" ? "reusada de la librería" : "generada y agregada a la librería";
      console.log(`  🖼  ${paso.id} ("${paso.imagenBusqueda}") → ${etiqueta}: ${resuelta.url}`);
      if (resuelta.fuente === "cache") reusadas += 1;
      else generadas += 1;
      pasosActualizados.push({ ...paso, imagenUrl: resuelta.url });
    } catch (err) {
      console.warn(`Error generando imagen para ${paso.id}:`, err instanceof Error ? err.message : err);
      saltadas += 1;
      pasosActualizados.push(paso);
    }
  }

  return { contenido: { ...contenido, pasos: pasosActualizados }, generadas, reusadas, saltadas };
}

interface ResultadoAudio {
  contenido: LeccionContenido;
  subidos: number;
  saltados: number;
}

async function generarAudios(leccionId: number, contenido: LeccionContenido): Promise<ResultadoAudio> {
  const pasosPronunciables = contenido.pasos.filter((p) => textoPronunciable(p) !== undefined);

  if (!isPiperConfigurado()) {
    if (pasosPronunciables.length > 0) {
      console.warn(
        `Piper no está configurado (falta PIPER_VOICE_PATH) — se omite audio para ${pasosPronunciables.length} paso(s).`
      );
    }
    return { contenido, subidos: 0, saltados: pasosPronunciables.length };
  }

  let subidos = 0;
  let saltados = 0;
  const pasosActualizados: PasoLeccion[] = [];

  for (const paso of contenido.pasos) {
    const texto = textoPronunciable(paso);
    if (texto === undefined) {
      pasosActualizados.push(paso);
      continue;
    }

    try {
      const textoLimpio = limpiarTextoParaVoz(texto);
      const audioBuffer = await sintetizarAudioPiper(textoLimpio);
      const key = `lecciones/${leccionId}/audio/${paso.id}.wav`;
      const url = await subirArchivoR2(key, audioBuffer, "audio/wav");

      if (!url) {
        console.warn(`No se pudo subir el audio del paso ${paso.id} (R2 no configurado o falló) — continúa sin audio.`);
        saltados += 1;
        pasosActualizados.push(paso);
        continue;
      }

      // Cotejo texto↔audio: registro exacto de qué dice cada archivo, y
      // verificación de que lo que quedó en R2 es byte a byte lo sintetizado.
      const remoto = await fetch(url, { method: "HEAD" }).catch(() => null);
      const bytesRemotos = remoto ? Number(remoto.headers.get("content-length")) : -1;
      if (bytesRemotos !== audioBuffer.length) {
        console.warn(
          `⚠ Cotejo FALLÓ en ${paso.id}: R2 tiene ${bytesRemotos} bytes, se sintetizaron ${audioBuffer.length} — paso sin audio.`
        );
        saltados += 1;
        pasosActualizados.push(paso);
        continue;
      }
      console.log(`  ♪ ${paso.id} dice ${JSON.stringify(textoLimpio)} (${audioBuffer.length} bytes, verificado en R2)`);

      subidos += 1;
      pasosActualizados.push({ ...paso, audioUrl: url });
    } catch (err) {
      console.warn(`No se pudo sintetizar audio para el paso ${paso.id}:`, err instanceof Error ? err.message : err);
      saltados += 1;
      pasosActualizados.push(paso);
    }
  }

  return { contenido: { ...contenido, pasos: pasosActualizados }, subidos, saltados };
}

async function main(): Promise<void> {
  const { leccionId, tema, dryRun } = parseArgs(process.argv.slice(2));

  const leccion = await prisma.leccion.findUnique({ where: { id: leccionId } });
  if (!leccion) {
    console.error(`No existe una Leccion con id=${leccionId}.`);
    process.exit(1);
  }

  // Sin Piper no hay audio: los pasos "escuchar" se guardarían con el
  // placeholder (un .wav que no existe) y la lección quedaría rota en
  // producción. Pasó de verdad — 40 lecciones se publicaron así porque el
  // aviso era solo un console.warn. Abortar acá, antes de gastar la llamada
  // a Claude, es más barato que descubrirlo después en la BD.
  if (!dryRun && !isPiperConfigurado()) {
    console.error(
      "PIPER_VOICE_PATH no está configurado (o el archivo de voz no existe).\n" +
        "Sin él los pasos 'escuchar' quedan con un audio placeholder inexistente.\n" +
        "Descargá la voz y reintentá:\n" +
        "  python3 -m piper.download_voices en_US-lessac-medium --data-dir voices\n" +
        '  PIPER_VOICE_PATH=$PWD/voices/en_US-lessac-medium.onnx npm run generate:leccion -- <id> "<tema>"'
    );
    process.exit(1);
  }

  console.log(`Generando contenido para Leccion #${leccionId} ("${leccion.titulo}") — tema: "${tema}"...`);
  const contenidoGenerado = await generarContenido(tema);
  console.log(`Contenido generado y validado: ${contenidoGenerado.pasos.length} pasos.`);

  if (dryRun) {
    console.log(JSON.stringify(contenidoGenerado, null, 2));
    console.log("--dry-run: no se generó audio ni se guardó nada en la base de datos.");
    return;
  }

  const { contenido: conAudio, subidos, saltados } = await generarAudios(leccionId, contenidoGenerado);
  const {
    contenido,
    generadas: imagenesGeneradas,
    reusadas: imagenesReusadas,
    saltadas: imagenesSaltadas,
  } = await generarImagenes(conAudio);

  // Red de seguridad: aunque Piper esté configurado, un paso suelto puede
  // haber fallado (síntesis, subida a R2, cotejo de bytes) y quedarse con el
  // placeholder. Nunca guardar una lección con audio inexistente.
  const pasosSinAudioReal = contenido.pasos.filter(
    (p) => p.tipo === "escuchar" && p.audioUrl === PLACEHOLDER_AUDIO_URL
  );
  if (pasosSinAudioReal.length > 0) {
    console.error(
      `${pasosSinAudioReal.length} paso(s) 'escuchar' quedaron con el audio placeholder ` +
        `(${pasosSinAudioReal.map((p) => p.id).join(", ")}) — no se guarda nada. Revisá Piper/R2 y reintentá.`
    );
    process.exit(1);
  }

  await prisma.leccion.update({
    where: { id: leccionId },
    data: { content: contenido },
  });

  console.log("── Resumen ──────────────────────────────────────");
  console.log(`Pasos generados: ${contenido.pasos.length}`);
  console.log(`Audios subidos:  ${subidos}`);
  console.log(`Audios saltados: ${saltados}`);
  console.log(`Imágenes nuevas (Gemini):     ${imagenesGeneradas}`);
  console.log(`Imágenes reusadas (librería): ${imagenesReusadas}`);
  console.log(`Imágenes saltadas:            ${imagenesSaltadas}`);
  console.log(`Leccion #${leccionId} actualizada.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
