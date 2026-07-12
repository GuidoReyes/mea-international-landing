import prisma from "../lib/prisma";

const URL_ZOOM_PLACEHOLDER = "https://zoom.us/j/PENDIENTE";
const DURACION_DEFAULT_MINUTOS = 60;

interface HorarioSeed {
  diaSemana: number;
  horaInicio: string;
}

interface GrupoSeed {
  slug: string;
  nombre: string;
  audiencia: string;
  niveles: string;
  horarios: HorarioSeed[];
}

// Lun=1, Mar=2, Mié=3, Jue=4 (0=domingo)
const LUN_MIE = (hora: string): HorarioSeed[] => [
  { diaSemana: 1, horaInicio: hora },
  { diaSemana: 3, horaInicio: hora },
];
const MAR_JUE = (hora: string): HorarioSeed[] => [
  { diaSemana: 2, horaInicio: hora },
  { diaSemana: 4, horaInicio: hora },
];

const GRUPOS: GrupoSeed[] = [
  { slug: "basic-ninos", nombre: "Basic Niños", audiencia: "ninos", niveles: "A1", horarios: LUN_MIE("17:00") },
  {
    slug: "basico-2-adolescentes",
    nombre: "Básico 2 Adolescentes",
    audiencia: "adolescentes",
    niveles: "A2",
    horarios: LUN_MIE("18:20"),
  },
  {
    slug: "advance-conversacional",
    nombre: "Advance Conversacional",
    audiencia: "adultos",
    niveles: "B2,C1",
    horarios: LUN_MIE("19:20"),
  },
  {
    slug: "basic-adultos",
    nombre: "Basic Adultos",
    audiencia: "adultos",
    niveles: "A1,A2",
    horarios: LUN_MIE("20:30"),
  },
  {
    slug: "starters",
    nombre: "Starters",
    audiencia: "general",
    niveles: "PRE_BEGINNERS",
    horarios: MAR_JUE("09:30"),
  },
  { slug: "cubs", nombre: "Cubs", audiencia: "ninos", niveles: "A1", horarios: MAR_JUE("16:00") },
  { slug: "smarties", nombre: "Smarties", audiencia: "ninos", niveles: "PRE_A1", horarios: MAR_JUE("17:00") },
  { slug: "adults", nombre: "Adults", audiencia: "adultos", niveles: "PRE_A1", horarios: MAR_JUE("19:00") },
];

async function seedGrupo(grupoSeed: GrupoSeed): Promise<void> {
  const grupo = await prisma.grupoClaseEnVivo.upsert({
    where: { slug: grupoSeed.slug },
    create: {
      slug: grupoSeed.slug,
      nombre: grupoSeed.nombre,
      audiencia: grupoSeed.audiencia,
      niveles: grupoSeed.niveles,
      urlZoom: URL_ZOOM_PLACEHOLDER,
      duracionMinutos: DURACION_DEFAULT_MINUTOS,
      activo: true,
    },
    update: {
      nombre: grupoSeed.nombre,
      audiencia: grupoSeed.audiencia,
      niveles: grupoSeed.niveles,
    },
  });

  for (const horario of grupoSeed.horarios) {
    await prisma.horarioClase.upsert({
      where: {
        grupoId_diaSemana_horaInicio: {
          grupoId: grupo.id,
          diaSemana: horario.diaSemana,
          horaInicio: horario.horaInicio,
        },
      },
      create: { grupoId: grupo.id, diaSemana: horario.diaSemana, horaInicio: horario.horaInicio },
      update: {},
    });
  }

  console.log(`Grupo listo: ${grupo.slug} (ID: ${grupo.id}, ${grupoSeed.horarios.length} horarios)`);
}

async function main(): Promise<void> {
  for (const grupo of GRUPOS) {
    await seedGrupo(grupo);
  }
  console.log(
    `Listo: ${GRUPOS.length} grupos, ${GRUPOS.reduce((s, g) => s + g.horarios.length, 0)} horarios. ` +
      `urlZoom es placeholder ("${URL_ZOOM_PLACEHOLDER}") — cargar las salas reales desde el admin.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
