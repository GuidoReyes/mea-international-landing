import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

const BCRYPT_ROUNDS = 10; // igual al costo con que se hashean los OTP reales

// Precomputado una vez por proceso: si no hay registro de OTP, se compara igual contra
// este hash (que nunca va a coincidir) en vez de responder de inmediato. Sin esto, un
// atacante puede distinguir "número sin OTP pendiente" de "número con OTP pendiente"
// por el tiempo de respuesta (vuln_013).
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

/**
 * Compares `codigo` against `codigoHash`. When there is no OTP record (hash null/undefined),
 * still runs a real bcrypt.compare against a dummy hash, so the response time is the same
 * either way and never reveals whether a pending OTP exists for that phone number.
 */
export async function verifyOtpCode(codigo: string, codigoHash: string | null | undefined): Promise<boolean> {
  return bcrypt.compare(codigo, codigoHash ?? DUMMY_HASH);
}
