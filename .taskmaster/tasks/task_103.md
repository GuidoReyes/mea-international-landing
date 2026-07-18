# Task ID: 103

**Title:** Implementar función sintetizarAudioPiper en Node con child_process

**Status:** done

**Dependencies:** 101 ✓, 102 ✓

**Priority:** high

**Description:** Wrapper Node para invocar Piper CLI, pasar texto por stdin, capturar WAV por stdout y subirlo a R2

**Details:**

Crear `backend/src/lib/tts.ts`. Exportar `async function sintetizarAudioPiper(texto: string, leccionId: number, pasoIndex: number): Promise<string | undefined>`. Usar `child_process.execFile` (no spawn ni exec por seguridad) para invocar `/usr/local/bin/piper --model /app/tts-models/en_US-lessac-medium.onnx --output-raw`. Pasar `texto` por stdin, capturar stdout (raw PCM) con un Buffer. Convertir PCM a WAV con headers (16kHz mono, 16-bit, formato estándar WAV RIFF). Importar `subirArchivoR2` de `lib/storage.ts`. Generar key como `lecciones/{leccionId}/paso-{pasoIndex}.wav`. Llamar `subirArchivoR2(key, wavBuffer, 'audio/wav')`. Retornar la URL pública o undefined si falla. Si R2 no está configurado, loguear warning y retornar undefined (modo degradado). Manejar errores de Piper (exit code != 0) logueando el stderr y retornando undefined.

**Test Strategy:**

Prueba unitaria (mock de execFile): verificar que se invoque Piper con los argumentos correctos y que se procese el stdout. Prueba de integración local (con binario Piper instalado): sintetizar 'Hello world', verificar que genere WAV válido, subirlo a R2 (si configurado) y reproducir el audio. Prueba de degradación: sin R2, verificar que retorne undefined sin romper.
