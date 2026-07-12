import prisma from "../lib/prisma";

/**
 * Seed del temario completo A1-C1 + Rutas de aprendizaje (Fase "Rutas").
 *
 * Fuente: `.taskmaster/docs/rutas-temario-a1-c1.md`. Las tablas de ese PRD
 * se transcriben UNA VEZ aquí como arrays estáticos (no se lee el .md en
 * runtime). Cada celda "Lecciones clave" del PRD, separada por coma o punto
 * y coma, es una Leccion — con dos excepciones documentadas explícitamente
 * donde partir por coma habría roto el contenido (ver notas junto a esas
 * filas más abajo).
 *
 * Idempotente: correr el script N veces no duplica Capitulo, Leccion, Ruta
 * ni RutaLeccion (findFirst/upsert en todos los pasos).
 */

// ─── Utilidades ────────────────────────────────────────────────────────────

/** kebab-case ascii, sin tildes ni símbolos. */
function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

interface LeccionConSlug {
  titulo: string;
  slug: string;
}

/** Genera slugs kebab-case únicos dentro del propio capítulo (evita colisiones). */
function generarSlugsUnicos(lecciones: readonly string[]): LeccionConSlug[] {
  const usados = new Map<string, number>();
  return lecciones.map((titulo) => {
    const base = slugify(titulo) || "leccion";
    const veces = usados.get(base) ?? 0;
    usados.set(base, veces + 1);
    const slug = veces === 0 ? base : `${base}-${veces + 1}`;
    return { titulo, slug };
  });
}

// ─── Temario A1-C1 ───────────────────────────────────────────────────────────
//
// NOTA sobre filas dobles del PRD ("(1 y 2)" o "Título A / Título B"): se
// modelan como DOS Capitulo separados. Cuando la celda de lecciones tenía
// varios ítems se repartieron entre ambos; cuando tenía un único ítem sin
// coma, se repite el mismo ítem en ambos capítulos (mismo tema gramatical,
// dos contextos distintos).
//
// NOTA sobre "Long Day at the Office / Waiting Long?" (C1): la celda del PRD
// es "Elipsis (omisión de palabras, 4 lecciones)" — la coma está DENTRO del
// paréntesis (nota aclaratoria, no una lista), así que partir mecánicamente
// por coma habría roto el contenido. Se interpretó como 4 lecciones sobre
// elipsis, repartidas 2 y 2 entre los dos capítulos. Es la única fila donde
// se inventó texto de lección no literal del PRD (el PRD solo decía "4
// lecciones" sin listarlas) — documentado también en el reporte final.
//
// NOTA sobre "What's Your Address?" (A1): la celda es "Números 100-10,000,
// direcciones" — la coma dentro de "10,000" es separador de miles, no de
// lista. Se tomó "Números 100-10,000" como un único ítem.

interface CapituloTemarioBase {
  titulo: string;
  lecciones: string[];
}

interface CapituloTemarioSeed extends CapituloTemarioBase {
  nivel: string;
}

const CAPITULOS_A1: CapituloTemarioBase[] = [
  // Fila 1 "Welcome / Greeting a Friend" y fila 2 "Hello and Goodbye" se
  // OMITEN aquí a propósito: coinciden temáticamente con el capítulo ya
  // sembrado "Saludos y presentaciones" (Fase 1) y no se duplican.
  { titulo: "Where Are You From?", lecciones: ["Nacionalidades", "To Be negativo e interrogativo"] },
  { titulo: "Welcome!", lecciones: ["Vocales", "To Have", "Artículos a/an", "Repaso"] },
  {
    titulo: "What's Your Number?",
    lecciones: ["Números 1-10", "Números 11-20", "Números 20-100", "How many?", "Intercambiar teléfonos"],
  },
  { titulo: "Classes and Courses", lecciones: ["Sustantivos plurales (regulares e irregulares)"] },
  { titulo: "The Weather", lecciones: ["Clima", "Temperatura", "Introducción a adjetivos"] },
  { titulo: "At the Beach", lecciones: ["This/That/These/Those", "Here/There", "Vocabulario de playa"] },
  {
    titulo: "Check-in at the Hotel",
    lecciones: ["There is/are", "Vocabulario de hotel", "Preposiciones de lugar"],
  },
  { titulo: "At the Hotel", lecciones: ["There is/are negativo e interrogativo", "Tours", "Buffet"] },
  // Fila "At the Train Station (1 y 2)" → 2 capítulos.
  { titulo: "At the Train Station 1", lecciones: ["Presente simple (+/-/?)", "Verbos comunes"] },
  { titulo: "At the Train Station 2", lecciones: ["Vocabulario de tren"] },
  { titulo: "What Time Is It?", lecciones: ["Números 1-60", "La hora (o'clock, half past, quarter to)"] },
  {
    titulo: "Seasons",
    lecciones: ["Estaciones del año", "Partes del día", "Días de la semana", "Preposiciones de tiempo"],
  },
  { titulo: "What's Your Address?", lecciones: ["Números 100-10,000", "Direcciones"] },
  { titulo: "What's the Date?", lecciones: ["Meses", "Números ordinales", "Fechas", "Años"] },
  { titulo: "At the Market", lecciones: ["Frutas y verduras", "Contables/incontables", "Some/any"] },
  { titulo: "At the Pharmacy", lecciones: ["Vocabulario de farmacia", "To Have Got"] },
  {
    titulo: "How Do You Get to...?",
    lecciones: ["Preguntas con question words", "Verbo To Get", "Direcciones"],
  },
  {
    titulo: "What Are You Doing These Days?",
    lecciones: ["Presente continuo", "Futuro con presente continuo"],
  },
  { titulo: "Catching the Bus", lecciones: ["Tomar el bus"] },
  { titulo: "At the Bank", lecciones: ["Cantidades (how much/many)", "Vocabulario de banco"] },
  { titulo: "At the Newsstand", lecciones: ["Intensificadores"] },
  { titulo: "Planning a Trip", lecciones: ["Futuro con going to"] },
  { titulo: "At the Restaurant", lecciones: ["Vocabulario de restaurante", "Would like (+/-/?)"] },
  {
    titulo: "I Want to Buy a New Computer",
    lecciones: ["Vocabulario de computación", "To like + gerundio/infinitivo"],
  },
  { titulo: "My Travel Blog", lecciones: ["Was/Were"] },
  { titulo: "Could I Take a Tour?", lecciones: ["Can/Can't/Could"] },
  { titulo: "Sightseeing", lecciones: ["Pasado simple", "Pronunciación -ed"] },
  { titulo: "A Football Match", lecciones: ["Pasado: pregunta y negación", "Vocabulario de fútbol"] },
  // Fila "Looking For a Flat / At the Cinema" → 2 capítulos (celda de
  // lecciones sin coma; se repite el mismo ítem en ambos).
  { titulo: "Looking For a Flat", lecciones: ["Verbos irregulares en pasado"] },
  { titulo: "At the Cinema", lecciones: ["Verbos irregulares en pasado"] },
];

const CAPITULOS_A2: CapituloTemarioBase[] = [
  { titulo: "Welcome to Mexico City!", lecciones: ["Contables/incontables", "A lot of / much / many"] },
  { titulo: "Working in the Garden", lecciones: ["Some/any", "A vs an"] },
  { titulo: "Moving House", lecciones: ["Vocabulario de mi casa", "Preposiciones in/at/on (lugar)"] },
  { titulo: "Scheduling Classes", lecciones: ["Expresiones de tiempo", "In/at/on (tiempo)"] },
  { titulo: "A Drive Through the Mountains", lecciones: ["Preposiciones de movimiento"] },
  {
    titulo: "Is That Yours?",
    lecciones: ["Posesivos (adjetivos y pronombres)", "Its/it's", "Their/there/they're"],
  },
  { titulo: "The Melting Pot", lecciones: ["Vocabulario de familia", "Migración", "'s posesiva"] },
  { titulo: "Visiting a Museum", lecciones: ["Comparativos (4 partes)", "Arte y museos"] },
  { titulo: "The Award Show", lecciones: ["Superlativos", "The best/the worst"] },
  { titulo: "A Thanksgiving Celebration", lecciones: ["Adverbios de frecuencia"] },
  { titulo: "Taking Pictures With Friends", lecciones: ["Números 0-999", "Gerundios", "Vocabulario de fotografía"] },
  { titulo: "A Five Thousand Kilometer Flight", lecciones: ["Números grandes", "Hablar de un viaje"] },
  // Fila "A Trip to Wales / A Summer Party" → 2 capítulos.
  { titulo: "A Trip to Wales", lecciones: ["Futuro going to / will"] },
  { titulo: "A Summer Party", lecciones: ["Geografía UK"] },
  { titulo: "If It Rains", lecciones: ["Primer condicional"] },
  { titulo: "A Job Interview", lecciones: ["Have to", "Preparación de entrevista de trabajo"] },
  { titulo: "Cooking With Friends", lecciones: ["Vocabulario de cocina", "Imperativo"] },
  {
    titulo: "What Would You Like to Eat?",
    lecciones: ["Pedidos en un restaurante", "Would like vs want vs like"],
  },
  { titulo: "How Do You Stay Fit?", lecciones: ["Vocabulario de fitness", "Preguntas con How"] },
  { titulo: "The News", lecciones: ["Vocabulario de noticias", "Should/shouldn't"] },
  { titulo: "Hi, I'm Texting You", lecciones: ["Presente continuo"] },
  { titulo: "Merry Christmas!", lecciones: ["Presente continuo para futuro"] },
  { titulo: "A Trip to Scotland", lecciones: ["Pasado simple completo", "Was/were"] },
  { titulo: "Not Feeling Well", lecciones: ["Vocabulario de enfermedad", "Pasado continuo"] },
  { titulo: "I Visited My Hometown", lecciones: ["Pasado continuo vs pasado simple"] },
  { titulo: "Getting Ready for Work", lecciones: ["Phrasal verbs comunes"] },
  { titulo: "Have You Ever...?", lecciones: ["Presente perfecto (+/-/?)"] },
  { titulo: "A Shopping Trip", lecciones: ["Can/could para habilidades"] },
  { titulo: "What Do You Do When It Rains?", lecciones: ["Condicional cero"] },
];

const CAPITULOS_B1: CapituloTemarioBase[] = [
  {
    titulo: "First Day on the Job",
    lecciones: ["Presente simple vs continuo (repaso aplicado a trabajo)"],
  },
  { titulo: "A Trip to the Cabin", lecciones: ["In/on/at para tiempo"] },
  { titulo: "How Did Your Presentation Go?", lecciones: ["Vocabulario de oficina", "Pasado simple (repaso)"] },
  { titulo: "How We Met", lecciones: ["Pasado continuo vs simple"] },
  { titulo: "Opening a New Office", lecciones: ["Ubicación"] },
  { titulo: "A Remodeling Dispute", lecciones: ["Futuro con will", "Usos especiales del futuro"] },
  { titulo: "A Delayed Delivery", lecciones: ["Artículos a/an/the", "Vocabulario de entregas"] },
  { titulo: "Having Friends Over", lecciones: ["Enough / too much"] },
  { titulo: "Onboarding", lecciones: ["Vocabulario de onboarding", "Futuro con going to"] },
  { titulo: "Better Vacation Destination", lecciones: ["Comparativos", "As...as"] },
  { titulo: "Looking for Work", lecciones: ["Presente para hablar de futuro", "Búsqueda de empleo"] },
  { titulo: "Shall We Go to the Opera?", lecciones: ["Shall", "Sugerencias"] },
  // Celda original con punto y coma: "Presente perfecto; yet/already/still/just".
  { titulo: "Following Up With Clients", lecciones: ["Presente perfecto", "Yet/already/still/just"] },
  { titulo: "Have You Been to Italy?", lecciones: ["Presente perfecto vs pasado simple"] },
  { titulo: "Climate Change", lecciones: ["Condicional cero y primero", "Unless"] },
  { titulo: "If I Won the Lottery", lecciones: ["Segundo condicional"] },
  { titulo: "What's Your Commute Like?", lecciones: ["Subject questions", "Vocabulario de commuting"] },
  { titulo: "A Flight Confirmation", lecciones: ["Must & have to"] },
  { titulo: "My Family Photo Album", lecciones: ["Relative clauses"] },
  { titulo: "Meeting a Deadline", lecciones: ["Pasado perfecto", "Vocabulario de deadlines"] },
  { titulo: "Asking for Directions", lecciones: ["Preguntas indirectas"] },
  { titulo: "Things Used to Be Different", lecciones: ["Used to", "Would para hábitos pasados"] },
  { titulo: "The Recycling Process", lecciones: ["Voz pasiva"] },
  { titulo: "Asking for a Promotion", lecciones: ["Reported speech", "Cómo pedir un aumento"] },
  { titulo: "How About We Get Dinner?", lecciones: ["Formas de sugerir"] },
  { titulo: "Delegating Tasks", lecciones: ["Verbos causativos", "Cómo delegar tareas"] },
];

const CAPITULOS_B2: CapituloTemarioBase[] = [
  { titulo: "Where Could My Keys Be?", lecciones: ["Deducciones (must/can't, may/might/could)"] },
  { titulo: "Job Interviews Lately", lecciones: ["Vocabulario de ventas", "Presente perfecto continuo"] },
  { titulo: "I Used to Drink Too Much", lecciones: ["Used to vs would"] },
  { titulo: "Getting Used to the Office", lecciones: ["Be used to / get used to"] },
  { titulo: "I Forgot My Passport!", lecciones: ["Pasado perfecto"] },
  { titulo: "A Quarterly Update", lecciones: ["Vocabulario de crecimiento", "Informes trimestrales"] },
  { titulo: "She Said She Had Studied", lecciones: ["Reported speech en pasado"] },
  { titulo: "Dealing With a Difficult Client", lecciones: ["As if / as though", "Vocabulario de cliente difícil"] },
  { titulo: "I Wish I Had Asked...", lecciones: ["Deseos en pasado"] },
  { titulo: "By the End of the Year", lecciones: ["Futuro perfecto", "Crecimiento corporativo"] },
  { titulo: "Planning a Barbecue", lecciones: ["Both/either/neither"] },
  { titulo: "The Deal Fell Through", lecciones: ["Deducciones en pasado", "Vocabulario de negociación"] },
  { titulo: "History of the Telephone", lecciones: ["Voz pasiva en pasado"] },
  { titulo: "Despite the Risks", lecciones: ["Contraste de ideas", "Startup vs corporativo"] },
  { titulo: "He Can't Make Me Study", lecciones: ["Make and let"] },
  { titulo: "You've Done Such a Great Job", lecciones: ["So/such", "Performance review"] },
  { titulo: "Whatever Store Is Fine", lecciones: ["Whoever/whatever/wherever..."] },
  { titulo: "I Wasn't Able to Catch My Flight", lecciones: ["Habilidades en pasado", "Viajes de negocios"] },
  { titulo: "If I Could, I Would Move to Paris", lecciones: ["Segundo condicional"] },
  { titulo: "An Interpersonal Dispute", lecciones: ["Tercer condicional", "Vocabulario de conflictos"] },
  { titulo: "The Storm of the Century", lecciones: ["Futuro continuo"] },
  { titulo: "A Company That Provides Solutions", lecciones: ["Defining relative clauses"] },
  { titulo: "What an Awful Morning", lecciones: ["Pasado perfecto continuo"] },
];

const CAPITULOS_C1: CapituloTemarioBase[] = [
  { titulo: "If I Hadn't Bought That Car", lecciones: ["Condicionales mixtos"] },
  { titulo: "Let's Open a Restaurant", lecciones: ["Futuro perfecto continuo"] },
  {
    titulo: "Never Have I Had a Worse Date",
    lecciones: ["Inversiones (Never have I..., Little did he know...)"],
  },
  { titulo: "What Shaped My Career Was...", lecciones: ["Cleft sentences (It/What)"] },
  { titulo: "Despite the Danger", lecciones: ["In spite of/despite", "Although/even though"] },
  {
    titulo: "Two Different Managers",
    lecciones: ["Even if", "While/whereas", "Much as", "Vocabulario de liderazgo"],
  },
  { titulo: "This Dog Might Be Lost", lecciones: ["Modales de certeza e incertidumbre"] },
  // Fila "Long Day at the Office / Waiting Long?" → 2 capítulos. Celda
  // original "Elipsis (omisión de palabras, 4 lecciones)": el PRD no lista
  // las 4 lecciones, solo indica que son 4 — se repartieron 2 y 2 con
  // títulos descriptivos del propio tema (ver nota arriba del archivo).
  {
    titulo: "Long Day at the Office",
    lecciones: ["Elipsis: omisión del sujeto y el verbo auxiliar", "Elipsis: omisión en respuestas cortas"],
  },
  {
    titulo: "Waiting Long?",
    lecciones: ["Elipsis: omisión en oraciones coordinadas", "Elipsis: omisión en frases informales"],
  },
  { titulo: "Never Had We Expected This", lecciones: ["Inversiones con no/not", "Vocabulario de auditoría"] },
  { titulo: "A College Tour", lecciones: ["Posesión avanzada", "Noun modifiers"] },
  { titulo: "What Are You Working On?", lecciones: ["Vocabulario de marketing", "Stative verbs"] },
  { titulo: "Were We to Adopt a Dog", lecciones: ["Inversión en condicionales 2 y 3"] },
  { titulo: "The Upcoming Recession", lecciones: ["Perfectos en contraste", "Vocabulario de recesión"] },
  { titulo: "The Dreaded Move", lecciones: ["Past perfect vs past perfect continuous"] },
  { titulo: "The End-of-Year Party", lecciones: ["Have/let/make/get", "Planificación de eventos"] },
  { titulo: "Welcome to Rome!", lecciones: ["Voz pasiva completa + con modales"] },
  { titulo: "It's Been Reported That...", lecciones: ["Pasiva impersonal"] },
  { titulo: "I Suggest They Take It Easy", lecciones: ["Subjuntivo para recomendaciones"] },
  { titulo: "We Need a New Manager", lecciones: ["If contrafactual"] },
  { titulo: "I Wish I Were More Disciplined", lecciones: ["Wishes"] },
  { titulo: "What a Transformation", lecciones: ["Exclamaciones what/how"] },
  { titulo: "Did You Hear...?", lecciones: ['Omisión de "that"'] },
];

const CAPITULOS_NUEVOS: CapituloTemarioSeed[] = [
  ...CAPITULOS_A1.map((c) => ({ ...c, nivel: "A1" })),
  ...CAPITULOS_A2.map((c) => ({ ...c, nivel: "A2" })),
  ...CAPITULOS_B1.map((c) => ({ ...c, nivel: "B1" })),
  ...CAPITULOS_B2.map((c) => ({ ...c, nivel: "B2" })),
  ...CAPITULOS_C1.map((c) => ({ ...c, nivel: "C1" })),
];

const ORDEN_INICIAL_NUEVOS = 3; // el CursoOnline "ingles-general" ya tiene 2 capítulos (orden 1 y 2)

const CURSO_GENERAL_SLUG_VIEJO = "ingles-general-a1";
const CURSO_GENERAL_SLUG_NUEVO = "ingles-general";
const CURSO_GENERAL_TITULO_NUEVO = "Inglés General";

const CAPITULO_SALUDOS_TITULO = "Saludos y presentaciones";
const CAPITULO_VIDA_DIARIA_TITULO = "Vida diaria";

const CURSO_TALLERES_SLUG = "ingles-talleres-mecanicos";
const CURSO_OFICINA_SLUG = "ingles-de-oficina";

// ─── Rutas ───────────────────────────────────────────────────────────────────

interface RutaSeed {
  slug: string;
  titulo: string;
  descripcion: string;
  nivelMinimo: string;
  nivelMaximo: string;
  orden: number;
}

const RUTAS: RutaSeed[] = [
  {
    slug: "general",
    titulo: "Inglés General",
    descripcion:
      "Recorré el temario completo de inglés de MEA, desde cero (A1) hasta nivel avanzado (C1), organizado por nivel.",
    nivelMinimo: "A1",
    nivelMaximo: "C1",
    orden: 1,
  },
  {
    slug: "viajar",
    titulo: "Inglés para Viajar",
    descripcion:
      "Inglés práctico para viajar: hoteles, transporte, direcciones y planificación de viajes, de nivel principiante a elemental.",
    nivelMinimo: "A1",
    nivelMaximo: "A2",
    orden: 2,
  },
  {
    slug: "restaurantes",
    titulo: "Inglés para Restaurantes",
    descripcion:
      "Inglés para atención en restaurantes: saludos, pedidos, vocabulario de cocina y servicio al cliente, de nivel principiante a elemental.",
    nivelMinimo: "A1",
    nivelMaximo: "A2",
    orden: 3,
  },
  {
    slug: "talleres",
    titulo: "Inglés para Talleres Mecánicos",
    descripcion:
      "Inglés técnico para mecánicos y personal de taller: vocabulario esencial y comunicación con clientes, de nivel principiante a elemental.",
    nivelMinimo: "A1",
    nivelMaximo: "A2",
    orden: 4,
  },
  {
    slug: "oficina",
    titulo: "Inglés de Oficina",
    descripcion:
      "Inglés profesional para el entorno laboral: reuniones, correos, entrevistas y comunicación de oficina, de nivel elemental a intermedio.",
    nivelMinimo: "A2",
    nivelMaximo: "B1",
    orden: 5,
  },
  {
    slug: "tecnicos-pc",
    titulo: "Inglés para Técnicos en Computación",
    descripcion:
      "Inglés técnico para soporte y computación: vocabulario de cómputo, reportes e indicaciones técnicas, de nivel elemental a intermedio.",
    nivelMinimo: "A2",
    nivelMaximo: "B1",
    orden: 6,
  },
  {
    slug: "call-center",
    titulo: "Inglés para Call Center",
    descripcion:
      "Inglés avanzado para call center: negociación, atención al cliente y comunicación indirecta, de nivel intermedio alto a avanzado.",
    nivelMinimo: "B2",
    nivelMaximo: "C1",
    orden: 7,
  },
];

/**
 * Matriz de asignación a Rutas (RutaLeccion), tomada literalmente de la
 * sección "Matriz de asignación a Rutas" del PRD. Cada entrada es el
 * título EXACTO de un Capitulo (ya sea uno de los 2 ya sembrados en Fase 1,
 * o uno de CAPITULOS_NUEVOS de arriba); se incluyen TODAS las lecciones de
 * ese capítulo. "general" se resuelve aparte (todas las lecciones del curso).
 *
 * Decisiones de desambiguación (la matriz del PRD describe temas, no
 * títulos de capítulo exactos, así que hubo que mapear tema → capítulo):
 * - "direcciones" (viajar/talleres) → se incluyeron tanto "How Do You Get
 *   to...?" (preguntas de dirección) como "What's Your Address?" (dar una
 *   dirección postal), ambos calzan con "direcciones".
 * - "sightseeing" (viajar) → se incluyó también "Could I Take a Tour?"
 *   (can/could + tours) porque complementa directamente el tema turístico,
 *   aunque el PRD solo nombra "sightseeing" literal.
 * - "pasado simple" (talleres A2) → se tomó "A Trip to Scotland" (Pasado
 *   simple completo) como capítulo representativo; hay varios capítulos A2
 *   que tocan pasado simple/continuo, se eligió el que lo cubre "completo".
 * - "presente continuo" (tecnicos-pc A2) → se incluyeron "Hi, I'm Texting
 *   You" y "Merry Christmas!" (las 2 lecciones de presente continuo en A2).
 * - "B1 completo de capítulos laborales" (oficina) y "B2 completo de
 *   capítulos de clientes/negociación" (call-center) → se interpretó
 *   literalmente: TODO el temario B1 (26 capítulos) y TODO el B2 (23
 *   capítulos) respectivamente, ya que ambas tablas del PRD están
 *   temáticamente centradas en trabajo/negocios de punta a punta.
 */
const TRACK_CHAPTERS: Record<string, string[]> = {
  viajar: [
    // A1: hotel, tren, bus, restaurante, banco, farmacia, mercado,
    // direcciones, hora, fechas, sightseeing
    "Check-in at the Hotel",
    "At the Hotel",
    "At the Train Station 1",
    "At the Train Station 2",
    "Catching the Bus",
    "At the Restaurant",
    "At the Bank",
    "At the Pharmacy",
    "At the Market",
    "How Do You Get to...?",
    "What's Your Address?",
    "What Time Is It?",
    "What's the Date?",
    "Sightseeing",
    "Could I Take a Tour?",
    // A2: viajes, vuelos, pedir comida
    "A Trip to Wales",
    "A Summer Party",
    "A Five Thousand Kilometer Flight",
    "A Trip to Scotland",
    "What Would You Like to Eat?",
  ],
  restaurantes: [
    // A1: saludos, números, hora, restaurante, some/any
    CAPITULO_SALUDOS_TITULO,
    "What's Your Number?",
    "What Time Is It?",
    "At the Restaurant",
    "At the Market",
    // A2: pedidos, imperativo, cocina
    "What Would You Like to Eat?",
    "Cooking With Friends",
  ],
  talleres: [
    // A1: saludos, números, hora, fechas, direcciones, presente simple, can/could
    CAPITULO_SALUDOS_TITULO,
    "What's Your Number?",
    "What Time Is It?",
    "What's the Date?",
    "How Do You Get to...?",
    "What's Your Address?",
    "At the Train Station 1",
    "At the Train Station 2",
    "Could I Take a Tour?",
    // A2: imperativo, should, have to, pasado simple, condicional 1
    "Cooking With Friends",
    "The News",
    "A Job Interview",
    "A Trip to Scotland",
    "If It Rains",
  ],
  oficina: [
    // A2: entrevista de trabajo, phrasal verbs, presente perfecto
    "A Job Interview",
    "Getting Ready for Work",
    "Have You Ever...?",
    // B1 completo (temario 100% laboral)
    ...CAPITULOS_B1.map((c) => c.titulo),
  ],
  "tecnicos-pc": [
    // A1: vocabulario de computación
    "I Want to Buy a New Computer",
    // A2: presente continuo, pasado, should
    "Hi, I'm Texting You",
    "Merry Christmas!",
    "I Visited My Hometown",
    "The News",
    // B1: indirectas, presente perfecto, pasiva, relative clauses
    "Asking for Directions",
    "Following Up With Clients",
    "Have You Been to Italy?",
    "The Recycling Process",
    "My Family Photo Album",
  ],
  "call-center": [
    // B1: reported speech e indirectas
    "Asking for a Promotion",
    "Asking for Directions",
    // B2 completo (temario centrado en clientes/negociación)
    ...CAPITULOS_B2.map((c) => c.titulo),
    // C1: pasiva impersonal, subjuntivo, modales de certeza
    "It's Been Reported That...",
    "I Suggest They Take It Easy",
    "This Dog Might Be Lost",
  ],
};

// ─── Paso 1: CursoOnline "ingles-general" ────────────────────────────────────

async function actualizarCursoGeneral(): Promise<number> {
  const existenteViejo = await prisma.cursoOnline.findUnique({
    where: { slug: CURSO_GENERAL_SLUG_VIEJO },
  });

  if (existenteViejo) {
    const actualizado = await prisma.cursoOnline.update({
      where: { id: existenteViejo.id },
      data: { slug: CURSO_GENERAL_SLUG_NUEVO, titulo: CURSO_GENERAL_TITULO_NUEVO },
    });
    console.log(`CursoOnline renombrado: ${CURSO_GENERAL_SLUG_VIEJO} → ${actualizado.slug} (ID: ${actualizado.id})`);
    return actualizado.id;
  }

  const yaRenombrado = await prisma.cursoOnline.findUnique({
    where: { slug: CURSO_GENERAL_SLUG_NUEVO },
  });

  if (!yaRenombrado) {
    throw new Error(
      `No se encontró CursoOnline con slug "${CURSO_GENERAL_SLUG_VIEJO}" ni "${CURSO_GENERAL_SLUG_NUEVO}". ` +
        `Corré primero seed-cursos-online.ts (Fase 1).`
    );
  }

  console.log(`CursoOnline ya estaba renombrado: ${yaRenombrado.slug} (ID: ${yaRenombrado.id})`);
  return yaRenombrado.id;
}

async function asegurarNivelCapitulosExistentes(cursoOnlineId: number): Promise<void> {
  for (const titulo of [CAPITULO_SALUDOS_TITULO, CAPITULO_VIDA_DIARIA_TITULO]) {
    const capitulo = await prisma.capitulo.findFirst({ where: { cursoOnlineId, titulo } });
    if (!capitulo) {
      console.warn(`Aviso: no se encontró el capítulo existente "${titulo}" bajo cursoOnlineId=${cursoOnlineId}`);
      continue;
    }
    if (capitulo.nivel !== "A1") {
      await prisma.capitulo.update({ where: { id: capitulo.id }, data: { nivel: "A1" } });
      console.log(`Capítulo "${titulo}": nivel corregido a A1`);
    }
  }
}

// ─── Paso 2: Capítulos y lecciones nuevos ───────────────────────────────────

interface StatsCapitulosLecciones {
  capitulosCreados: number;
  capitulosExistentes: number;
  leccionesCreadas: number;
  leccionesExistentes: number;
}

async function seedCapitulosYLecciones(cursoOnlineId: number): Promise<StatsCapitulosLecciones> {
  const stats: StatsCapitulosLecciones = {
    capitulosCreados: 0,
    capitulosExistentes: 0,
    leccionesCreadas: 0,
    leccionesExistentes: 0,
  };

  for (const [index, capituloSeed] of CAPITULOS_NUEVOS.entries()) {
    const orden = ORDEN_INICIAL_NUEVOS + index;

    let capitulo = await prisma.capitulo.findFirst({
      where: { cursoOnlineId, titulo: capituloSeed.titulo },
    });

    if (capitulo) {
      stats.capitulosExistentes += 1;
    } else {
      capitulo = await prisma.capitulo.create({
        data: {
          cursoOnlineId,
          titulo: capituloSeed.titulo,
          nivel: capituloSeed.nivel,
          orden,
        },
      });
      stats.capitulosCreados += 1;
    }

    const leccionesConSlug = generarSlugsUnicos(capituloSeed.lecciones);

    for (const [lecIndex, leccionSeed] of leccionesConSlug.entries()) {
      const leccionExistente = await prisma.leccion.findFirst({
        where: { capituloId: capitulo.id, slug: leccionSeed.slug },
      });

      if (leccionExistente) {
        stats.leccionesExistentes += 1;
        continue;
      }

      await prisma.leccion.create({
        data: {
          capituloId: capitulo.id,
          titulo: leccionSeed.titulo,
          slug: leccionSeed.slug,
          orden: lecIndex + 1,
          esGratis: false,
          urlContenido: null,
        },
      });
      stats.leccionesCreadas += 1;
    }
  }

  return stats;
}

// ─── Paso 3: Rutas ───────────────────────────────────────────────────────────

async function seedRutas(): Promise<Map<string, number>> {
  const rutaIdPorSlug = new Map<string, number>();

  for (const ruta of RUTAS) {
    const guardada = await prisma.ruta.upsert({
      where: { slug: ruta.slug },
      create: {
        slug: ruta.slug,
        titulo: ruta.titulo,
        descripcion: ruta.descripcion,
        nivelMinimo: ruta.nivelMinimo,
        nivelMaximo: ruta.nivelMaximo,
        orden: ruta.orden,
        publicada: true,
      },
      update: {
        titulo: ruta.titulo,
        descripcion: ruta.descripcion,
        nivelMinimo: ruta.nivelMinimo,
        nivelMaximo: ruta.nivelMaximo,
        orden: ruta.orden,
        publicada: true,
      },
    });
    rutaIdPorSlug.set(ruta.slug, guardada.id);
    console.log(`Ruta lista: ${guardada.slug} (ID: ${guardada.id})`);
  }

  return rutaIdPorSlug;
}

// ─── Paso 4: RutaLeccion ─────────────────────────────────────────────────────

async function obtenerLeccionIdsDeCurso(cursoOnlineId: number): Promise<number[]> {
  const capitulos = await prisma.capitulo.findMany({
    where: { cursoOnlineId },
    include: { lecciones: { orderBy: { orden: "asc" } } },
    orderBy: { orden: "asc" },
  });
  return capitulos.flatMap((c) => c.lecciones.map((l) => l.id));
}

async function obtenerLeccionIdsDeCapitulos(cursoOnlineId: number, titulosCapitulo: string[]): Promise<number[]> {
  const idsUnicos: number[] = [];
  const vistos = new Set<number>();

  for (const titulo of titulosCapitulo) {
    const capitulo = await prisma.capitulo.findFirst({
      where: { cursoOnlineId, titulo },
      include: { lecciones: { orderBy: { orden: "asc" } } },
    });

    if (!capitulo) {
      console.warn(`Aviso: capítulo "${titulo}" no encontrado bajo cursoOnlineId=${cursoOnlineId} (matriz de rutas)`);
      continue;
    }

    for (const leccion of capitulo.lecciones) {
      if (!vistos.has(leccion.id)) {
        vistos.add(leccion.id);
        idsUnicos.push(leccion.id);
      }
    }
  }

  return idsUnicos;
}

async function obtenerLeccionIdsDeCursoPorSlug(slug: string): Promise<number[]> {
  const curso = await prisma.cursoOnline.findUnique({ where: { slug } });
  if (!curso) {
    console.warn(`Aviso: CursoOnline "${slug}" no encontrado, se omite en la matriz de rutas`);
    return [];
  }
  return obtenerLeccionIdsDeCurso(curso.id);
}

async function asignarLeccionesARuta(rutaId: number, leccionIds: number[]): Promise<void> {
  for (const [index, leccionId] of leccionIds.entries()) {
    await prisma.rutaLeccion.upsert({
      where: { rutaId_leccionId: { rutaId, leccionId } },
      create: { rutaId, leccionId, orden: index + 1 },
      update: { orden: index + 1 },
    });
  }
}

async function seedRutaLecciones(
  cursoGeneralId: number,
  rutaIdPorSlug: Map<string, number>
): Promise<Record<string, number>> {
  const conteoPorRuta: Record<string, number> = {};

  // "general": todas las lecciones del curso Inglés General.
  const rutaGeneralId = rutaIdPorSlug.get("general");
  if (rutaGeneralId) {
    const idsGeneral = await obtenerLeccionIdsDeCurso(cursoGeneralId);
    await asignarLeccionesARuta(rutaGeneralId, idsGeneral);
    conteoPorRuta.general = idsGeneral.length;
  }

  // Rutas curadas desde el pool general.
  for (const [slug, titulosCapitulo] of Object.entries(TRACK_CHAPTERS)) {
    const rutaId = rutaIdPorSlug.get(slug);
    if (!rutaId) continue;

    const idsDelPool = await obtenerLeccionIdsDeCapitulos(cursoGeneralId, titulosCapitulo);

    let idsExtra: number[] = [];
    if (slug === "talleres") {
      idsExtra = await obtenerLeccionIdsDeCursoPorSlug(CURSO_TALLERES_SLUG);
    } else if (slug === "oficina") {
      idsExtra = await obtenerLeccionIdsDeCursoPorSlug(CURSO_OFICINA_SLUG);
    }

    const vistos = new Set<number>();
    const idsFinal: number[] = [];
    for (const id of [...idsDelPool, ...idsExtra]) {
      if (!vistos.has(id)) {
        vistos.add(id);
        idsFinal.push(id);
      }
    }

    await asignarLeccionesARuta(rutaId, idsFinal);
    conteoPorRuta[slug] = idsFinal.length;
  }

  return conteoPorRuta;
}

// ─── main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cursoGeneralId = await actualizarCursoGeneral();
  await asegurarNivelCapitulosExistentes(cursoGeneralId);

  const statsCapitulos = await seedCapitulosYLecciones(cursoGeneralId);
  console.log(
    `Capítulos: ${statsCapitulos.capitulosCreados} creados, ${statsCapitulos.capitulosExistentes} ya existían.`
  );
  console.log(
    `Lecciones: ${statsCapitulos.leccionesCreadas} creadas, ${statsCapitulos.leccionesExistentes} ya existían.`
  );

  const rutaIdPorSlug = await seedRutas();
  const conteoPorRuta = await seedRutaLecciones(cursoGeneralId, rutaIdPorSlug);

  console.log("--- Resumen RutaLeccion por ruta ---");
  for (const ruta of RUTAS) {
    console.log(`  ${ruta.slug}: ${conteoPorRuta[ruta.slug] ?? 0} lecciones`);
  }
  console.log(`Total lecciones en ruta "general": ${conteoPorRuta.general ?? 0}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
