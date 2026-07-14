import bcrypt from "bcrypt";
import prisma from "../lib/prisma";

async function main() {
  // || (no ??): un ADMIN_EMAIL="" seteado por accidente creaba un admin sin email
  const email = process.env.ADMIN_EMAIL || "admin@mea.edu.gt";
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador MEA";

  // Sin fallback: el upsert de abajo SOBRESCRIBE la contraseña en cada corrida,
  // así que un default conocido ("admin123") reabriría la puerta aunque ya se
  // hubiera cambiado. Mejor fallar acá.
  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD requerido (mínimo 12 caracteres) para correr el seed.");
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    create: { email, password: hashed, nombre },
    update: { password: hashed, nombre, activo: true },
  });

  console.log(`Admin creado/actualizado: ${admin.email} (ID: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1; // que el fallo se note en CI/scripts, no solo en el log
  })
  .finally(() => prisma.$disconnect());
