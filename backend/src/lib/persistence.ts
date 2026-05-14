import { PrismaClient } from "@prisma/client";
import prisma from "./prisma";
import { log } from "./logger";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function guardarMensajes(
  telefono: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      // 1. Upsert lead por teléfono
      const lead = await tx.lead.upsert({
        where: { telefono },
        create: { telefono },
        update: { actualizadoEn: new Date() },
      });

      // 2. Buscar conversación activa o crear una nueva
      let conversacion = await tx.conversacionWhatsApp.findFirst({
        where: { telefono, estado: "activo" },
      });

      if (!conversacion) {
        conversacion = await tx.conversacionWhatsApp.create({
          data: { leadId: lead.id, telefono, estado: "activo" },
        });
      }

      // 3. Guardar ambos mensajes
      await tx.mensajeWhatsApp.createMany({
        data: [
          { conversacionId: conversacion.id, rol: "user", contenido: userMessage },
          { conversacionId: conversacion.id, rol: "assistant", contenido: assistantResponse },
        ],
      });
    });
  } catch (err) {
    // Falla silenciosa — la persistencia no debe interrumpir la respuesta del bot
    log("error", "[Persistence] Error guardando mensajes:", err);
  }
}
