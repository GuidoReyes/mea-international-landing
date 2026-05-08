FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

RUN npm run build

EXPOSE 4000

CMD npx prisma db push && node dist/index.js
