import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function deriveKey(secret: string, salt: Buffer): Buffer {
  if (!secret) throw new Error("Se requiere un secreto para cifrar o descifrar");
  return scryptSync(secret, salt, KEY_BYTES);
}

export function isEncrypted(payload: string): boolean {
  return payload.startsWith(PREFIX);
}

/**
 * AES-256-GCM with a key derived from `secret` via scrypt and a fresh random salt and IV per call.
 * Output: "enc:v1:" + base64(salt | iv | auth tag | ciphertext), so it is self-contained.
 */
export function encrypt(data: string, secret: string): string {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([salt, iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/** Throws if the secret is wrong or the content was altered: GCM authenticates the ciphertext. */
export function decrypt(payload: string, secret: string): string {
  if (!isEncrypted(payload)) throw new Error("El contenido no está cifrado con el formato esperado");

  const raw = Buffer.from(payload.slice(PREFIX.length), "base64");
  if (raw.length < SALT_BYTES + IV_BYTES + TAG_BYTES) throw new Error("Contenido cifrado incompleto");

  const salt = raw.subarray(0, SALT_BYTES);
  const iv = raw.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const tag = raw.subarray(SALT_BYTES + IV_BYTES, SALT_BYTES + IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(SALT_BYTES + IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret, salt), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("No se pudo descifrar: secreto incorrecto o contenido alterado");
  }
}
