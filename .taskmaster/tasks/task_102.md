# Task ID: 102

**Title:** Configurar binario Piper TTS en Dockerfile para síntesis de voz offline

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Descargar el binario Piper CLI (Linux x64) y el modelo en_US-lessac-medium.onnx en el contenedor Docker de Railway

**Details:**

Editar `backend/Dockerfile` (o crear si no existe). Agregar paso RUN para descargar el binario Piper desde GitHub releases (https://github.com/rhasspy/piper/releases, versión estable más reciente, ej. v1.2.0) para Linux x64. Descargar el modelo `en_US-lessac-medium.onnx` y `en_US-lessac-medium.onnx.json` desde Hugging Face (https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium). Colocar el binario en `/usr/local/bin/piper` con permisos de ejecución (`RUN chmod +x /usr/local/bin/piper`). Colocar los archivos del modelo en `/app/tts-models/en_US-lessac-medium.onnx` y `.json`. Verificar que el tamaño de la imagen Docker no crezca excesivamente (comprimir con multi-stage build si es necesario). Documentar las env vars de R2 en `.env.example` (CLOUDFLARE_R2_ACCOUNT_ID, ACCESS_KEY, SECRET_KEY).

**Test Strategy:**

Build local de la imagen Docker: `docker build -t mea-backend .` y verificar que el binario y modelos estén presentes (`docker run --rm mea-backend ls -lh /usr/local/bin/piper /app/tts-models`). Ejecutar un test simple dentro del contenedor: `echo 'Hello world' | piper --model /app/tts-models/en_US-lessac-medium.onnx --output_file /tmp/test.wav` y verificar que genere un WAV válido. Deploy a Railway y verificar que no rompa el build.
