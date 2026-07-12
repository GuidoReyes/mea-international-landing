import prisma from "../lib/prisma";

interface LeccionSeed {
  titulo: string;
  slug: string;
  esGratis: boolean;
}

interface CapituloSeed {
  titulo: string;
  lecciones: LeccionSeed[];
}

interface CursoSeed {
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: string;
  track: string;
  orden: number;
  capitulos: CapituloSeed[];
}

const CURSOS: CursoSeed[] = [
  {
    slug: "ingles-general-a1",
    titulo: "Inglés General — Nivel A1",
    descripcion:
      "Empezá desde cero con las bases del inglés: saludos, presentaciones y conversaciones del día a día. Lecciones cortas y autoguiadas a tu ritmo.",
    nivel: "A1",
    track: "general",
    orden: 1,
    capitulos: [
      {
        titulo: "Saludos y presentaciones",
        lecciones: [
          { titulo: "Saludos básicos y despedidas", slug: "saludos-basicos", esGratis: true },
          { titulo: "Presentarte: nombre, país y ocupación", slug: "presentarte", esGratis: true },
          { titulo: "El verbo to be en presente", slug: "verbo-to-be", esGratis: false },
          { titulo: "Preguntas personales básicas", slug: "preguntas-personales", esGratis: false },
        ],
      },
      {
        titulo: "Vida diaria",
        lecciones: [
          { titulo: "Rutinas: presente simple", slug: "rutinas-presente-simple", esGratis: false },
          { titulo: "La hora, los días y los meses", slug: "hora-dias-meses", esGratis: false },
          { titulo: "Comida y restaurantes: pedir en inglés", slug: "pedir-comida", esGratis: false },
        ],
      },
    ],
  },
  {
    slug: "ingles-talleres-mecanicos",
    titulo: "Inglés para Talleres Mecánicos",
    descripcion:
      "Inglés técnico para mecánicos y personal de talleres: herramientas, partes del vehículo, diagnóstico y atención a clientes en inglés. Único en el mercado.",
    nivel: "oficios",
    track: "mecanica",
    orden: 2,
    capitulos: [
      {
        titulo: "Herramientas y partes del vehículo",
        lecciones: [
          { titulo: "Herramientas esenciales del taller", slug: "herramientas-taller", esGratis: true },
          { titulo: "Partes del motor en inglés", slug: "partes-motor", esGratis: true },
          { titulo: "Sistema de frenos y suspensión", slug: "frenos-suspension", esGratis: false },
          { titulo: "Sistema eléctrico y diagnóstico", slug: "sistema-electrico", esGratis: false },
        ],
      },
      {
        titulo: "Atención al cliente en el taller",
        lecciones: [
          { titulo: "Recibir al cliente y entender el problema", slug: "recibir-cliente", esGratis: false },
          { titulo: "Explicar la reparación y el presupuesto", slug: "explicar-reparacion", esGratis: false },
          { titulo: "Entrega del vehículo y seguimiento", slug: "entrega-vehiculo", esGratis: false },
        ],
      },
    ],
  },
  {
    slug: "ingles-de-oficina",
    titulo: "Inglés de Oficina",
    descripcion:
      "Inglés profesional para el trabajo: correos, llamadas, reuniones y presentaciones. Ideal para call centers, empresas y trabajo remoto.",
    nivel: "B1",
    track: "oficina",
    orden: 3,
    capitulos: [
      {
        titulo: "Comunicación escrita",
        lecciones: [
          { titulo: "Correos profesionales: estructura y saludos", slug: "correos-profesionales", esGratis: true },
          { titulo: "Pedir y confirmar información por escrito", slug: "pedir-informacion", esGratis: false },
          { titulo: "Mensajes en chat y herramientas de trabajo", slug: "chat-trabajo", esGratis: false },
        ],
      },
      {
        titulo: "Llamadas y reuniones",
        lecciones: [
          { titulo: "Contestar llamadas y tomar mensajes", slug: "contestar-llamadas", esGratis: false },
          { titulo: "Participar en reuniones: opinar y preguntar", slug: "participar-reuniones", esGratis: false },
          { titulo: "Presentaciones cortas en inglés", slug: "presentaciones-cortas", esGratis: false },
        ],
      },
    ],
  },
];

interface PrecioSeed {
  duracionMeses: number;
  precioMesCentavos: number;
  precioRegularMesCentavos: number;
}

interface PlanSeed {
  slug: string;
  nombre: string;
  descripcion: string;
  features: string[];
  recomendado: boolean;
  incluyeClasesEnVivo: boolean;
  precios: PrecioSeed[];
}

// Precios placeholder en GTQ — ajustar cuando Guido defina los reales y re-correr el seed
const PLANES: PlanSeed[] = [
  {
    slug: "esencial",
    nombre: "Esencial",
    descripcion: "Todos los cursos autoguiados a tu ritmo, con certificados incluidos.",
    features: [
      "Acceso a todos los cursos autoguiados",
      "Cursos técnicos: talleres, mecánica y oficina",
      "Certificados verificables al completar",
      "Soporte por WhatsApp",
    ],
    recomendado: false,
    incluyeClasesEnVivo: false,
    precios: [
      { duracionMeses: 1, precioMesCentavos: 29900, precioRegularMesCentavos: 29900 },
      { duracionMeses: 3, precioMesCentavos: 26900, precioRegularMesCentavos: 29900 },
      { duracionMeses: 6, precioMesCentavos: 23900, precioRegularMesCentavos: 29900 },
      { duracionMeses: 12, precioMesCentavos: 20900, precioRegularMesCentavos: 29900 },
    ],
  },
  {
    slug: "profesional",
    nombre: "Profesional",
    descripcion: "Todo lo del plan Esencial más clases en vivo y acompañamiento personalizado.",
    features: [
      "Todo lo del plan Esencial",
      "Clases en vivo con profesores",
      "Acompañamiento personalizado por WhatsApp",
      "Prioridad en soporte y feedback",
    ],
    recomendado: true,
    incluyeClasesEnVivo: true,
    precios: [
      { duracionMeses: 1, precioMesCentavos: 49900, precioRegularMesCentavos: 49900 },
      { duracionMeses: 3, precioMesCentavos: 44900, precioRegularMesCentavos: 49900 },
      { duracionMeses: 6, precioMesCentavos: 39900, precioRegularMesCentavos: 49900 },
      { duracionMeses: 12, precioMesCentavos: 34900, precioRegularMesCentavos: 49900 },
    ],
  },
];

// "ingles-general-a1" fue renombrado a "ingles-general" por seed-curriculum.ts
// (Rutas). Buscar por ambos slugs evita crear un CursoOnline duplicado si
// este seed se re-corre después de esa migración.
const SLUGS_ALTERNOS: Record<string, string> = {
  "ingles-general-a1": "ingles-general",
};

async function seedCursos() {
  for (const curso of CURSOS) {
    const slugAlterno = SLUGS_ALTERNOS[curso.slug];
    const existente = await prisma.cursoOnline.findFirst({
      where: { slug: slugAlterno ? { in: [curso.slug, slugAlterno] } : curso.slug },
    });
    if (existente) {
      console.log(`Curso ya existe (slug actual: ${existente.slug}), se omite: ${curso.slug}`);
      continue;
    }

    const creado = await prisma.cursoOnline.create({
      data: {
        slug: curso.slug,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        nivel: curso.nivel,
        track: curso.track,
        orden: curso.orden,
        publicado: true,
        capitulos: {
          create: curso.capitulos.map((cap, capIndex) => ({
            titulo: cap.titulo,
            orden: capIndex + 1,
            lecciones: {
              create: cap.lecciones.map((leccion, lecIndex) => ({
                titulo: leccion.titulo,
                slug: leccion.slug,
                orden: lecIndex + 1,
                esGratis: leccion.esGratis,
              })),
            },
          })),
        },
      },
    });
    console.log(`Curso creado: ${creado.slug} (ID: ${creado.id})`);
  }
}

async function seedPlanes() {
  for (const plan of PLANES) {
    const guardado = await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: {
        slug: plan.slug,
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        features: plan.features,
        recomendado: plan.recomendado,
        incluyeClasesEnVivo: plan.incluyeClasesEnVivo,
      },
      update: {
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        features: plan.features,
        recomendado: plan.recomendado,
        incluyeClasesEnVivo: plan.incluyeClasesEnVivo,
      },
    });

    for (const precio of plan.precios) {
      const totalCentavos = precio.precioMesCentavos * precio.duracionMeses;
      const regularCentavos = precio.precioRegularMesCentavos * precio.duracionMeses;
      await prisma.planPrecio.upsert({
        where: {
          planId_duracionMeses: { planId: guardado.id, duracionMeses: precio.duracionMeses },
        },
        create: {
          planId: guardado.id,
          duracionMeses: precio.duracionMeses,
          precioMesCentavos: precio.precioMesCentavos,
          precioTotalCentavos: totalCentavos,
          precioRegularCentavos: regularCentavos,
          moneda: "GTQ",
        },
        update: {
          precioMesCentavos: precio.precioMesCentavos,
          precioTotalCentavos: totalCentavos,
          precioRegularCentavos: regularCentavos,
        },
      });
    }
    console.log(`Plan actualizado: ${guardado.slug} (${plan.precios.length} precios)`);
  }
}

async function main() {
  await seedCursos();
  await seedPlanes();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
