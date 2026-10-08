import prisma from "./prisma";
import { normalizePhone } from "./phone-utils";
import { log } from "./logger";

// PRD mea-logica-negocio R9: Lead no tenia ninguna forma de saber en que
// Alumno termino convirtiendo -- CRM/Marketing median el embudo a ciegas,
// sin poder decir cuantos leads de una campana realmente pagaron. Esto
// enlaza ambos por telefono o email cuando se crea una cuenta nueva (registro
// self-service o alta manual del admin), y adelanta el lead a estado
// "inscrito" en vez de depender de que alguien lo marque a mano.
export async function vincularLeadConAlumnoNuevo(alumno: {
  id: number;
  email: string | null;
  whatsapp: string | null;
}): Promise<void> {
  const telefono = alumno.whatsapp ? normalizePhone(alumno.whatsapp) : null;
  const email = alumno.email?.trim().toLowerCase() ?? null;
  if (!telefono && !email) return;

  const lead = await prisma.lead.findFirst({
    where: {
      alumnoId: null,
      OR: [
        ...(telefono ? [{ telefono }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });
  if (!lead) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: { alumnoId: alumno.id, estado: "inscrito" },
  });

  log("info", `[LeadAlumno] Lead ${lead.id} enlazado a alumno ${alumno.id} (convertido)`);
}
