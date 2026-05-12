import bcrypt from "bcrypt";
import prisma from "../lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@mea.edu.gt";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador MEA";

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    create: { email, password: hashed, nombre },
    update: { password: hashed, nombre, activo: true },
  });

  console.log(`Admin creado/actualizado: ${admin.email} (ID: ${admin.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
