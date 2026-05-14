import { createClient } from "redis";
import { log } from "./logger";

const CHAT_HISTORY_TTL = 86400; // 24 horas
const COURSE_CACHE_TTL = 3600;  // 1 hora

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

client.on("error", (err) => log("error", "Redis Client Error:", err));
client.on("connect", () => log("info", "Redis Client Connected"));
client.on("reconnecting", () => log("info", "Redis Client Reconnecting"));

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
}

connect().catch((err) => log("error", "Redis connection failed:", err));

process.on("SIGTERM", async () => {
  await client.quit();
  log("info", "Redis connection closed");
});
process.on("SIGINT", async () => {
  await client.quit();
  log("info", "Redis connection closed");
});

async function setWithTTL(key: string, value: string, seconds: number) {
  if (!client.isReady) return;
  await client.setEx(key, seconds, value);
}

async function getJSON<T>(key: string): Promise<T | null> {
  if (!client.isReady) return null;
  const value = await client.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown, ttl = CHAT_HISTORY_TTL) {
  if (!client.isReady) return;
  await client.setEx(key, ttl, JSON.stringify(value));
}

export default client;
export { setWithTTL, getJSON, setJSON, CHAT_HISTORY_TTL, COURSE_CACHE_TTL };
