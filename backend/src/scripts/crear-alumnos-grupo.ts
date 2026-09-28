import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { inscribirEnCursosPublicados } from "../lib/suscripciones";
import { createWithUniqueRetry } from "../lib/retry-on-conflict";

// Crea (o reutiliza) una cuenta de Alumno por cada estudiante de un grupo que ya
// pagó, les otorga acceso a TODAS las lecciones vía una Suscripcion "manual_admin"
// ACTIVA (mismo mecanismo que el botón "Dar acceso a todas las lecciones" del
// admin, ver src/routes/alumnos.ts POST /:id/acceso-manual) y genera una
// contraseña simple para poder enviársela.
//
// Uso:
//   ROSTER_FILE=./roster.json DATABASE_URL="mysql://..." npx ts-node src/scripts/crear-alumnos-grupo.ts
//
// roster.json = [{ "nombre": "Carlos", "apellido": "Pérez", "email": "carlos@x.com", "whatsapp": "+50255555555" }]
//
// Flags (env):
//   DRY_RUN=1          → no escribe nada, solo muestra qué haría
//   RESET_PASSWORD=1   → si el alumno ya existe, le pone una contraseña nueva

const BCRYPT_ROUNDS = 10; // igual que src/routes/alumnos.ts

interface EstudianteInput {
  nombre: string;
  apellido: string;
  email: string;
  whatsapp?: string;
  password?: string; // si viene en el roster, se usa tal cual; si no, se genera
}

interface ResultadoRow {
  nombre: string;
  email: string;
  carnet: string;
  password: string;
  estado: string;
}

function normalizarNombre(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// vuln_041: antes usaba Math.random() (PRNG no criptográfico y predecible) para
// los 3 dígitos finales. randomInt() es criptográficamente seguro. Se mantiene
// el formato legible iam<nombre><nnn>: es un pedido explícito del usuario para
// repartir las contraseñas por WhatsApp (ver memoria student-password-format);
// generateSecurePassword() de lib/crypto-utils.ts rompería ese formato.
export function generarPassword(nombre: string, email: string): string {
  const local = email.split("@")[0] ?? "";
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? "";
  const base = normalizarNombre(primerNombre) || normalizarNombre(local) || "alumno";
  const digitos = String(randomInt(100, 1000));
  return `iam${base}${digitos}`;
}

// vuln_043: ROSTER_FILE es una ruta de archivo tomada de una variable de entorno;
// esto evita que un valor como "../../etc/passwd" (por error o por un wrapper
// menos confiable) resuelva fuera del directorio del proyecto. Mismo patrón que
// resolveScanPaths en security-agent/scanner.ts (tarea #479).
export function resolveRosterPath(rawPath: string, baseDir: string): string {
  const realBase = realpathSync(baseDir);
  const resolved = path.resolve(realBase, rawPath);
  const real = existsSync(resolved) ? realpathSync(resolved) : resolved;
  const relative = path.relative(realBase, real);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`ROSTER_FILE debe resolver dentro de ${realBase}: ${JSON.stringify(rawPath)}`);
  }
  return real;
}

export function parseRoster(raw: string): EstudianteInput[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`ROSTER_FILE no es JSON válido: ${(e as Error).message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error("ROSTER_FILE debe ser un array de estudiantes");
  }
  return data.map((item, i) => {
    const row = item as Record<string, unknown>;
    const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
    const apellido = typeof row.apellido === "string" ? row.apellido.trim() : "";
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    const whatsapp = typeof row.whatsapp === "string" ? row.whatsapp.trim() : "";
    const password = typeof row.password === "string" ? row.password.trim() : "";
    if (!nombre || !apellido || !email) {
      throw new Error(`Fila ${i + 1}: nombre, apellido y email son obligatorios`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Fila ${i + 1}: email inválido (${email})`);
    }
    if (password && password.length < 8) {
      throw new Error(`Fila ${i + 1}: password debe tener al menos 8 caracteres`);
    }
    return {
      nombre,
      apellido,
      email,
      whatsapp: whatsapp || undefined,
      password: password || undefined,
    };
  });
}

async function generarCarnetBase(): Promise<{ year: number; siguiente: number }> {
  const year = new Date().getFullYear();
  const count = await prisma.alumno.count({
    where: { carnet: { startsWith: `MEA-${year}-` } },
  });
  return { year, siguiente: count + 1 };
}

// vuln_042: recalculado con un count() fresco en cada llamada (no un contador
// local incrementado en memoria), para usarlo dentro de createWithUniqueRetry —
// mismo patrón que generarCarnet() en routes/alumnos.ts (tareas #483/#485). El
// índice UNIQUE de la BD (Alumno_carnet_key) ya rechaza el duplicado (P2002); si
// otro proceso (ej. el panel admin) crea un alumno mientras corre este script,
// se reintenta con un carnet recién generado en vez de fallar.
async function generarCarnet(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.alumno.count({
    where: { carnet: { startsWith: `MEA-${year}-` } },
  });
  return `MEA-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function planPrecioParaAccesoManual() {
  // Mismo criterio que POST /api/alumnos/:id/acceso-manual
  const planPrecio = await prisma.planPrecio.findFirst({
    where: { plan: { recomendado: true } },
    orderBy: { duracionMeses: "desc" },
    include: { plan: true },
  });
  if (!planPrecio) {
    throw new Error(
      "No hay un PlanPrecio con plan.recomendado=true. Corré primero `npm run seed:cursos-online`."
    );
  }
  return planPrecio;
}

async function otorgarAccesoTotal(alumnoId: number, planPrecioId: number): Promise<void> {
  const existente = await prisma.suscripcion.findFirst({
    where: { alumnoId, proveedor: "manual_admin" },
    orderBy: { creadoEn: "desc" },
  });

  if (existente) {
    await prisma.suscripcion.update({
      where: { id: existente.id },
      data: { estado: "ACTIVA", fechaInicio: new Date(), fechaFin: null },
    });
  } else {
    await prisma.suscripcion.create({
      data: {
        alumnoId,
        planPrecioId,
        estado: "ACTIVA",
        proveedor: "manual_admin",
        fechaInicio: new Date(),
        fechaFin: null,
      },
    });
  }

  await inscribirEnCursosPublicados(alumnoId);
}

async function main(): Promise<void> {
  const rosterFile = process.env.ROSTER_FILE;
  if (!rosterFile) {
    throw new Error("Falta ROSTER_FILE (ruta al JSON con la lista de estudiantes)");
  }
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const resetPassword =
    process.env.RESET_PASSWORD === "1" || process.env.RESET_PASSWORD === "true";
  // Por defecto el script SOLO crea el login. El acceso a lecciones se otorga
  // desde el panel admin. OTORGAR_ACCESO=1 hace que además cree la Suscripcion
  // manual_admin ACTIVA (mismo efecto que el botón del admin).
  const otorgarAcceso =
    process.env.OTORGAR_ACCESO === "1" || process.env.OTORGAR_ACCESO === "true";

  const rosterPath = resolveRosterPath(rosterFile, process.cwd());
  const estudiantes = parseRoster(readFileSync(rosterPath, "utf8"));
  console.log(`Estudiantes en el roster: ${estudiantes.length}${dryRun ? "  (DRY_RUN)" : ""}`);
  console.log(`Otorgar acceso a lecciones: ${otorgarAcceso ? "sí" : "no (solo crea login)"}`);

  const planPrecio = otorgarAcceso ? await planPrecioParaAccesoManual() : null;
  if (planPrecio) {
    console.log(
      `Plan para acceso manual: ${planPrecio.plan.nombre} (${planPrecio.duracionMeses} meses)`
    );
  }

  const carnetBase = await generarCarnetBase();
  let siguienteCarnet = carnetBase.siguiente;
  const resultados: ResultadoRow[] = [];

  for (const est of estudiantes) {
    const existente = await prisma.alumno.findUnique({ where: { email: est.email } });

    if (existente) {
      let passwordMostrar = "(sin cambio)";
      if (resetPassword) {
        passwordMostrar = est.password ?? generarPassword(est.nombre, est.email);
        if (!dryRun) {
          await prisma.alumno.update({
            where: { id: existente.id },
            data: {
              password: await bcrypt.hash(passwordMostrar, BCRYPT_ROUNDS),
              primerLogin: false,
              activo: true,
            },
          });
        }
      } else if (!dryRun) {
        await prisma.alumno.update({ where: { id: existente.id }, data: { activo: true } });
      }

      if (!dryRun && planPrecio) await otorgarAccesoTotal(existente.id, planPrecio.id);

      const notaAcceso = planPrecio ? " · acceso OK" : "";
      resultados.push({
        nombre: `${existente.nombre} ${existente.apellido}`,
        email: est.email,
        carnet: existente.carnet,
        password: passwordMostrar,
        estado: (resetPassword ? "existía · pwd reseteada" : "existía") + notaAcceso,
      });
      continue;
    }

    const password = est.password ?? generarPassword(est.nombre, est.email);

    if (dryRun) {
      // Solo vista previa: el carnet real sale de generarCarnet() (count() fresco)
      // dentro de createWithUniqueRetry cuando se crea de verdad, no de este contador.
      const carnetPreview = `MEA-${carnetBase.year}-${String(siguienteCarnet).padStart(4, "0")}`;
      siguienteCarnet += 1;
      resultados.push({
        nombre: `${est.nombre} ${est.apellido}`,
        email: est.email,
        carnet: carnetPreview,
        password,
        estado: "se crearía",
      });
      continue;
    }

    const alumno = await createWithUniqueRetry(
      async () => {
        const carnet = await generarCarnet(); // recalculado en cada intento, no reutilizado
        return prisma.alumno.create({
          data: {
            carnet,
            nombre: est.nombre,
            apellido: est.apellido,
            email: est.email,
            whatsapp: est.whatsapp,
            pais: "GT",
            activo: true,
            primerLogin: false,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS),
          },
        });
      },
      "carnet"
    );
    if (planPrecio) await otorgarAccesoTotal(alumno.id, planPrecio.id);

    resultados.push({
      nombre: `${est.nombre} ${est.apellido}`,
      email: est.email,
      carnet: alumno.carnet,
      password,
      estado: planPrecio ? "creado · acceso OK" : "creado (login)",
    });
  }

  console.table(resultados);

  if (!dryRun) {
    // vuln_040 (HIGH, Accepted Risk en la ronda 1, retomado en la ronda 2): el CSV
    // sigue con contraseñas en texto plano y permisos 0600 (solo el dueño del
    // archivo puede leerlo). Migrar a stdout o a un canal cifrado es un cambio de
    // flujo operativo (cómo se reparten las credenciales por WhatsApp), no un fix
    // de una línea — requiere que el dueño del proyecto decida antes de tocar
    // este comportamiento. Queda pendiente, documentado acá.
    const outFile = `${rosterPath}.credenciales.csv`;
    const csv = [
      "nombre,email,carnet,password,estado",
      ...resultados.map((r) =>
        [r.nombre, r.email, r.carnet, r.password, r.estado]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    writeFileSync(outFile, csv, { mode: 0o600, encoding: "utf8" });
    console.log(`\nCredenciales escritas en: ${outFile}`);
    console.log("⚠️  Contiene contraseñas en texto plano. Borralo después de repartirlas.");
  }
}

// vuln_042 (relacionado): antes main() se ejecutaba incondicionalmente al cargar
// el módulo, así que importar cualquier función de este archivo (p. ej. desde un
// test) disparaba una corrida real contra la BD como efecto secundario. Mismo bug
// y mismo fix que seed-admin.ts (tarea #486).
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
