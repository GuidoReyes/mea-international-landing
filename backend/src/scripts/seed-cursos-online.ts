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

// Precios reales (2026-07): Plataforma Q150/mes, Plataforma + Grupos Q300/mes.
// Descuentos por duración: 3 meses -10%, 6 meses -20%, 12 meses -30%.
// Mismos precios que muestra la landing (content/site.json). Checkout: depósito BI.
const PLANES: PlanSeed[] = [
  {
    slug: "plataforma",
    nombre: "Plataforma",
    descripcion: "Acceso completo a la plataforma educativa: cursos, material digital y clases grabadas a tu ritmo.",
    features: [
      "Acceso completo a la plataforma educativa",
      "Cursos técnicos: talleres, mecánica y oficina",
      "Material digital y clases grabadas",
      "Certificados verificables al completar",
      "Soporte por WhatsApp",
    ],
    recomendado: false,
    incluyeClasesEnVivo: false,
    precios: [
      { duracionMeses: 1, precioMesCentavos: 13000, precioRegularMesCentavos: 13000 },
      { duracionMeses: 3, precioMesCentavos: 13500, precioRegularMesCentavos: 15000 },
      { duracionMeses: 6, precioMesCentavos: 12000, precioRegularMesCentavos: 15000 },
      { duracionMeses: 12, precioMesCentavos: 10500, precioRegularMesCentavos: 15000 },
    ],
  },
  {
    slug: "plataforma-grupos",
    nombre: "Plataforma + Grupos",
    descripcion: "Todo lo del plan Plataforma más clases en vivo grupales por Zoom.",
    features: [
      "Todo lo del plan Plataforma",
      "Clases en vivo grupales por Zoom",
      "Acompañamiento personalizado por WhatsApp",
      "Prioridad en soporte y feedback",
    ],
    recomendado: true,
    incluyeClasesEnVivo: true,
    precios: [
      { duracionMeses: 1, precioMesCentavos: 30000, precioRegularMesCentavos: 30000 },
      { duracionMeses: 3, precioMesCentavos: 27000, precioRegularMesCentavos: 30000 },
      { duracionMeses: 6, precioMesCentavos: 24000, precioRegularMesCentavos: 30000 },
      { duracionMeses: 12, precioMesCentavos: 21000, precioRegularMesCentavos: 30000 },
    ],
  },
];

// Renombres de planes (mismo patrón que SLUGS_ALTERNOS de cursos): si el plan
// existe con el slug viejo, se actualiza en el lugar en vez de crear uno nuevo.
const PLAN_SLUGS_ALTERNOS: Record<string, string> = {
  plataforma: "esencial",
  "plataforma-grupos": "profesional",
};

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
    const slugAlterno = PLAN_SLUGS_ALTERNOS[plan.slug];
    const existente = await prisma.plan.findFirst({
      where: { slug: slugAlterno ? { in: [plan.slug, slugAlterno] } : plan.slug },
    });

    const datos = {
      slug: plan.slug,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      features: plan.features,
      recomendado: plan.recomendado,
      incluyeClasesEnVivo: plan.incluyeClasesEnVivo,
    };

    const guardado = existente
      ? await prisma.plan.update({ where: { id: existente.id }, data: datos })
      : await prisma.plan.create({ data: datos });

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
