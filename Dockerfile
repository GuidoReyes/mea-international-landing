FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN npx prisma generate && npm run build

RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "dist/index.js"]
