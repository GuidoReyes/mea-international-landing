import client from "./redis";

const HANDOFF_TTL = 3600; // 1 hora — asesor tiene 1h antes de que el bot retome
const key = (telefono: string) => `handoff:${telefono}`;

export async function activarModoHumano(telefono: string): Promise<void> {
  if (!client.isReady) return;
  await client.setEx(key(telefono), HANDOFF_TTL, "1");
}

export async function desactivarModoHumano(telefono: string): Promise<void> {
  if (!client.isReady) return;
  await client.del(key(telefono));
}

export async function estaModoHumano(telefono: string): Promise<boolean> {
  if (!client.isReady) return false;
  return (await client.exists(key(telefono))) > 0;
}

export async function tiempoRestanteHandoff(telefono: string): Promise<number> {
  if (!client.isReady) return 0;
  return Math.max(0, await client.ttl(key(telefono)));
}
