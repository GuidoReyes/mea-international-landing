FROM node:20-slim

# default-mysql-client provides mysqldump, required by the backup system
# curl + ca-certificates required to fetch the Piper TTS binary and voice files below
RUN apt-get update -y && apt-get install -y openssl default-mysql-client curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Piper TTS — static binary release (used by lib/piper-tts to synthesize lesson audio)
RUN mkdir -p /opt/piper && \
    curl -fsSL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
      -o /tmp/piper.tar.gz && \
    tar -xzf /tmp/piper.tar.gz -C /opt/piper --strip-components=1 && \
    rm /tmp/piper.tar.gz && \
    ln -s /opt/piper/piper /usr/local/bin/piper

# Piper voice — en_US-lessac-medium (English TTS model + config used at runtime)
RUN mkdir -p /opt/piper-voices && \
    curl -fsSL https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
      -o /opt/piper-voices/en_US-lessac-medium.onnx && \
    curl -fsSL https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json \
      -o /opt/piper-voices/en_US-lessac-medium.onnx.json

ENV PIPER_VOICE_PATH=/opt/piper-voices/en_US-lessac-medium.onnx

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN npx prisma generate && npm run build

RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "dist/index.js"]
