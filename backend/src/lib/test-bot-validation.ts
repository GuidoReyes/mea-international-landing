import { z } from "zod";

// Endpoint de prueba manual (/api/test-bot): envía WhatsApp real y gasta tokens de
// Anthropic. Mismo formato de teléfono que se acepta en el resto del proyecto
// (dígitos, 7 a 15 caracteres — cubre números locales y con código de país).
export const testBotInputSchema = z.object({
  telefono: z.string().regex(/^\d{7,15}$/, "telefono debe ser solo dígitos (7-15 caracteres)"),
  mensaje: z.string().min(1).max(4096, "mensaje no puede superar 4096 caracteres"),
});

export type TestBotInput = z.infer<typeof testBotInputSchema>;
