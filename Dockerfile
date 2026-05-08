FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN npm run build && npx prisma generate

RUN npm prune --omit=dev

EXPOSE 4000

CMD npx prisma db push && node dist/index.js
