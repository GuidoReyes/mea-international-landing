import prisma from "../lib/prisma";

const ETAPAS = [
  { nombre: "Nuevo",       orden: 1, color: "#3B82F6" },
  { nombre: "Contactado",  orden: 2, color: "#F59E0B" },
  { nombre: "Interesado",  orden: 3, color: "#8B5CF6" },
  { nombre: "Propuesta",   orden: 4, color: "#EC4899" },
  { nombre: "Negociación", orden: 5, color: "#F97316" },
  { nombre: "Cerrado",     orden: 6, color: "#10B981" },
];

async function main() {
  for (const etapa of ETAPAS) {
    await prisma.cRMEtapa.upsert({
      where: { orden: etapa.orden },
      create: etapa,
      update: etapa,
    });
  }
  console.log("CRM Etapas seeded successfully");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error(e);
    process.exit(1);
  });
