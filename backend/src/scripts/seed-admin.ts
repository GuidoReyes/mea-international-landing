import bcrypt from "bcrypt";
import prisma from "../lib/prisma";

// vuln_044: "admin@mea.edu.gt" por defecto es un email conocido y predecible; si alguien
// corre el seed sin ADMIN_EMAIL en un entorno nuevo, crea (o resetea la contraseña de)
// un admin en una dirección que cualquiera puede adivinar. Sin default: falla y avisa.
export function requireAdminEmail(raw: string | undefined): string {
  if (!raw) throw new Error("ADMIN_EMAIL requerido para correr el seed (sin valor por defecto).");
  return raw;
}

async function main() {
  const email = requireAdminEmail(process.env.ADMIN_EMAIL);
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

// Solo corre el seed cuando el archivo se ejecuta directamente (npm run seed:admin),
// nunca al importarlo (como hace test-script-security.ts por requireAdminEmail) —
// sin esto, un simple `import` ejecutaba el upsert completo contra la BD real.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1; // que el fallo se note en CI/scripts, no solo en el log
    })
    .finally(() => prisma.$disconnect());
}
