import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

/**
 * Seed de la expansión a 500 lecciones (259 nuevas, 37 por curso × 7 cursos).
 *
 * Fuente: `.taskmaster/docs/expansion-500-lecciones.md`. Reglas:
 * - Cada uno de los 7 cursos/rutas recibe EXACTAMENTE 37 lecciones nuevas.
 * - Ninguna lección nueva repite tema con una ya existente en NINGÚN curso —
 *   los cursos vocacionales (viajar/restaurantes/talleres/oficina/tecnicos-pc/
 *   call-center) tienen ángulo/rol distinto aunque compartan escenario con
 *   "general" (ej. restaurantes = perspectiva del MESERO, viajar = perspectiva
 *   del TURISTA, general = vocabulario neutro de comensal).
 * - content queda en null: estas son placeholders de currículo (título/slug/
 *   orden), el contenido interactivo (LessonPlayer) se genera después vía
 *   generate-leccion.ts, una lección a la vez, trackeado en Task Master.
 *
 * Idempotente: correr el script N veces no duplica CursoOnline, Capitulo,
 * Leccion, Ruta ni RutaLeccion (findFirst/upsert en todos los pasos).
 */

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

interface LeccionConSlug {
  titulo: string;
  slug: string;
}

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

export interface CapituloSeed {
  titulo: string;
  nivel: string;
  lecciones: string[];
}

export interface CursoSeed {
  cursoSlug: string;
  cursoTitulo: string;
  cursoDescripcion: string;
  cursoNivel: string;
  cursoTrack: string;
  rutaSlug: string;
  capitulos: CapituloSeed[];
}

// ─── GENERAL (+37: A1+8, A2+7, B1+8, B2+7, C1+7) — temas de gramática/vocab
// que todavía no existen en los 228 ya sembrados. ────────────────────────────
const GENERAL: CapituloSeed[] = [
  { nivel: "A1", titulo: "My Family", lecciones: ["Miembros de la familia", "Posesivos simples (my/your/his/her)"] },
  { nivel: "A1", titulo: "Colors and Shapes", lecciones: ["Colores", "Formas y tamaños"] },
  { nivel: "A1", titulo: "At School", lecciones: ["Vocabulario escolar", "Imperativos básicos (instrucciones de clase)"] },
  { nivel: "A1", titulo: "Free Time", lecciones: ["Pasatiempos y hobbies", "Like/dislike + gerundio"] },
  { nivel: "A2", titulo: "Making Plans", lecciones: ["Invitar y aceptar/rechazar planes", "Preposiciones de tiempo aplicadas a planes"] },
  { nivel: "A2", titulo: "At the Doctor's", lecciones: ["Síntomas y vocabulario médico", "Consejos de salud con should/shouldn't"] },
  { nivel: "A2", titulo: "Renting an Apartment", lecciones: ["Vocabulario de renta", "Comparar opciones de apartamento", "Preguntas para negociar el precio"] },
  { nivel: "B1", titulo: "Giving Feedback", lecciones: ["Vocabulario de feedback constructivo", "Formas suaves de criticar (softening language)"] },
  { nivel: "B1", titulo: "Online Shopping", lecciones: ["Vocabulario de compras online", "Reclamos y devoluciones"] },
  { nivel: "B1", titulo: "Social Media", lecciones: ["Vocabulario de redes sociales", "Phrasal verbs de tecnología"] },
  { nivel: "B1", titulo: "Making Excuses", lecciones: ["Excusas comunes", "Reported speech aplicado a excusas"] },
  { nivel: "B2", titulo: "Debating Opinions", lecciones: ["Conectores de contraste y causa-efecto", "Estructuras para argumentar (in my opinion, arguably)"] },
  { nivel: "B2", titulo: "Job Negotiations", lecciones: ["Vocabulario de negociación salarial", "Modales de cortesía avanzada (would/could/might)"] },
  { nivel: "B2", titulo: "Environmental Issues", lecciones: ["Vocabulario ambiental avanzado", "Voz pasiva aplicada a noticias ambientales", "Sugerencias formales (I suggest that + subjuntivo)"] },
  { nivel: "C1", titulo: "Idioms at Work", lecciones: ["Modismos de oficina comunes", "Modismos de negociación"] },
  { nivel: "C1", titulo: "Academic Writing", lecciones: ["Conectores académicos formales", "Nominalización (formal writing style)"] },
  { nivel: "C1", titulo: "Public Speaking", lecciones: ["Estructuras retóricas (rhetorical questions, tricolon)", "Manejo de preguntas difíciles del público", "Lenguaje persuasivo avanzado"] },
];

// ─── TALLERES MECÁNICOS (+37: A1+15, A2+22) — ya tiene 7 lecciones A1. ──────
const TALLERES: CapituloSeed[] = [
  { nivel: "A1", titulo: "Safety First", lecciones: ["Equipo de protección personal", "Señales de seguridad en el taller", "Procedimientos de emergencia básicos"] },
  { nivel: "A1", titulo: "Common Repairs", lecciones: ["Cambio de aceite y filtros", "Rotación y balanceo de llantas", "Batería: revisión y reemplazo"] },
  { nivel: "A1", titulo: "Diagnosing Problems", lecciones: ["Preguntas para diagnosticar (qué ruido, cuándo pasa)", "Vocabulario de síntomas del vehículo", "El escáner de diagnóstico OBD"] },
  { nivel: "A1", titulo: "Parts and Inventory", lecciones: ["Pedir refacciones por teléfono", "Vocabulario de inventario", "Números de parte y códigos"] },
  { nivel: "A1", titulo: "Scheduling Appointments", lecciones: ["Agendar una cita de servicio", "Confirmar y reprogramar citas", "Explicar tiempos de espera"] },
  { nivel: "A2", titulo: "Engine Trouble", lecciones: ["Vocabulario de motor avanzado", "Presente perfecto aplicado a diagnóstico (has the car overheated?)", "Explicar causas probables"] },
  { nivel: "A2", titulo: "Transmission and Drivetrain", lecciones: ["Vocabulario de transmisión", "Modales de posibilidad (might/could be)", "Diagnóstico de ruidos de transmisión"] },
  { nivel: "A2", titulo: "Brakes and Suspension Advanced", lecciones: ["Vocabulario avanzado de frenos y suspensión", "Comparativos aplicados a la condición del vehículo", "Recomendaciones de seguridad"] },
  { nivel: "A2", titulo: "Air Conditioning and Electrical", lecciones: ["Vocabulario de aire acondicionado", "Sistema eléctrico avanzado", "Fusibles y relés"] },
  { nivel: "A2", titulo: "Customer Complaints", lecciones: ["Manejar quejas de clientes", "Disculpas profesionales", "Ofrecer soluciones"] },
  { nivel: "A2", titulo: "Estimates and Invoicing", lecciones: ["Explicar un presupuesto detallado", "Vocabulario de facturación", "Negociar el costo de reparación", "Métodos de pago aceptados"] },
  { nivel: "A2", titulo: "Warranty and Follow-up", lecciones: ["Vocabulario de garantía", "Seguimiento post-servicio", "Programar mantenimiento futuro"] },
];

// ─── OFICINA (+37: A1+8, A2+15, B1+14) — ya tiene 6 lecciones A1. ──────────
const OFICINA: CapituloSeed[] = [
  { nivel: "A1", titulo: "Office Vocabulary", lecciones: ["Objetos y equipo de oficina", "Departamentos de una empresa", "Puestos y jerarquías"] },
  { nivel: "A1", titulo: "Daily Office Routine", lecciones: ["Rutina de la oficina en presente simple", "Horarios y descansos"] },
  { nivel: "A1", titulo: "Being Polite at Work", lecciones: ["Please/could you/would you mind", "Agradecer y disculparse profesionalmente", "Ofrecer ayuda a un colega"] },
  { nivel: "A2", titulo: "Writing Emails 2", lecciones: ["Emails de seguimiento (follow-up)", "Adjuntar archivos y referencias", "Cerrar un email formal"] },
  { nivel: "A2", titulo: "Meetings 2", lecciones: ["Proponer una agenda", "Tomar notas y minutas", "Interrumpir educadamente", "Videollamadas: vocabulario técnico"] },
  { nivel: "A2", titulo: "Scheduling and Calendars", lecciones: ["Coordinar horarios entre husos horarios", "Reprogramar una reunión", "Confirmar asistencia"] },
  { nivel: "A2", titulo: "Small Talk at Work", lecciones: ["Charla informal antes de reuniones", "Preguntas seguras de small talk", "Temas a evitar en el trabajo"] },
  { nivel: "A2", titulo: "Giving Instructions", lecciones: ["Instrucciones paso a paso", "Verificar que se entendió"] },
  { nivel: "B1", titulo: "Presentations 2", lecciones: ["Estructurar una presentación", "Lenguaje de transición (firstly, moreover)", "Responder preguntas del público"] },
  { nivel: "B1", titulo: "Negotiating", lecciones: ["Vocabulario de negociación básica", "Proponer y contraproponer", "Llegar a un acuerdo", "Vocabulario de contratos básico"] },
  { nivel: "B1", titulo: "Performance Reviews", lecciones: ["Vocabulario de evaluación de desempeño", "Recibir feedback profesionalmente"] },
  { nivel: "B1", titulo: "Project Management", lecciones: ["Vocabulario de gestión de proyectos", "Reportar avances y bloqueos", "Establecer plazos (deadlines)"] },
  { nivel: "B1", titulo: "Business Writing", lecciones: ["Tono formal vs informal en escritura", "Redactar un memo interno"] },
];

// ─── VIAJAR (+37: A1+19, A2+18) — curso nuevo, 0 lecciones hoy. ────────────
const VIAJAR: CapituloSeed[] = [
  { nivel: "A1", titulo: "At the Airport", lecciones: ["Check-in y equipaje", "Seguridad y aduana", "Encontrar tu puerta de embarque"] },
  { nivel: "A1", titulo: "On the Plane", lecciones: ["Vocabulario a bordo", "Pedir algo a la tripulación", "Retrasos y cambios de vuelo"] },
  { nivel: "A1", titulo: "Getting a Taxi or Uber", lecciones: ["Pedir un taxi", "Dar una dirección al conductor"] },
  { nivel: "A1", titulo: "Checking Into a Hotel (Traveler)", lecciones: ["Reservar una habitación", "Preguntas frecuentes de recepción", "Pedir servicios del hotel"] },
  { nivel: "A1", titulo: "Asking for Directions (Traveler)", lecciones: ["Pedir direcciones en la calle", "Entender indicaciones"] },
  { nivel: "A1", titulo: "Emergencies While Traveling", lecciones: ["Pedir ayuda en una emergencia", "Vocabulario médico básico para turistas", "Reportar algo perdido o robado"] },
  { nivel: "A1", titulo: "Money and Shopping Abroad", lecciones: ["Cambiar dinero", "Comprar souvenirs y regatear", "Preguntar precios y tallas"] },
  { nivel: "A2", titulo: "Public Transportation Abroad", lecciones: ["Comprar boletos de metro/tren", "Leer mapas y señales de transporte", "Preguntar por conexiones"] },
  { nivel: "A2", titulo: "Eating Out as a Tourist", lecciones: ["Pedir recomendaciones de restaurantes", "Entender un menú turístico", "Pedir la cuenta y pagar"] },
  { nivel: "A2", titulo: "Sightseeing and Tours", lecciones: ["Reservar un tour", "Preguntar sobre horarios y entradas", "Tomar fotos y pedir ayuda"] },
  { nivel: "A2", titulo: "Dealing With Travel Problems", lecciones: ["Equipaje perdido", "Vuelo cancelado o retrasado", "Quejarse educadamente en un hotel"] },
  { nivel: "A2", titulo: "Cultural Differences", lecciones: ["Costumbres y etiqueta al viajar", "Small talk con locales", "Errores comunes de turistas"] },
  { nivel: "A2", titulo: "Planning an Itinerary", lecciones: ["Vocabulario de planificación de viaje", "Comparar destinos", "Presupuesto de viaje"] },
];

// ─── RESTAURANTES (+37: A1+19, A2+18) — curso nuevo, perspectiva del STAFF
// (mesero/anfitrión), no del comensal — así no repite con "At the Restaurant"
// de general (que enseña a PEDIR comida, no a atender mesas). ───────────────
const RESTAURANTES: CapituloSeed[] = [
  { nivel: "A1", titulo: "Welcoming Guests", lecciones: ["Saludar y sentar a los clientes", "Preguntar el número de personas", "Manejar la lista de espera"] },
  { nivel: "A1", titulo: "Taking Orders", lecciones: ["Presentar el menú", "Tomar el pedido de bebidas", "Tomar el pedido de comida", "Sugerir platillos del día"] },
  { nivel: "A1", titulo: "Menu Vocabulary (Staff)", lecciones: ["Vocabulario de platillos comunes", "Describir ingredientes", "Alérgenos comunes"] },
  { nivel: "A1", titulo: "Serving the Table", lecciones: ["Servir los platillos correctamente", "Preguntar si todo está bien", "Retirar platos vacíos"] },
  { nivel: "A1", titulo: "Handling Payment (Staff)", lecciones: ["Traer la cuenta", "Métodos de pago y propina", "Dividir la cuenta"] },
  { nivel: "A1", titulo: "Basic Restaurant Rules", lecciones: ["Vocabulario de áreas del restaurante", "Turnos y responsabilidades del staff", "Higiene y manejo de alimentos"] },
  { nivel: "A2", titulo: "Handling Complaints (Restaurant Staff)", lecciones: ["Escuchar la queja del cliente", "Disculparse y ofrecer una solución", "Cuándo llamar al gerente"] },
  { nivel: "A2", titulo: "Special Requests", lecciones: ["Alergias y restricciones alimenticias", "Modificar un platillo", "Peticiones especiales de niños/bebés"] },
  { nivel: "A2", titulo: "Reservations (Staff)", lecciones: ["Tomar una reservación por teléfono", "Confirmar y modificar reservaciones", "Manejar clientes sin reservación"] },
  { nivel: "A2", titulo: "Upselling and Recommendations", lecciones: ["Recomendar platillos y bebidas", "Ofrecer postres y extras", "Sugerir maridajes básicos"] },
  { nivel: "A2", titulo: "Working as a Team", lecciones: ["Comunicación entre meseros y cocina", "Vocabulario de comandas", "Resolver malentendidos en la cocina"] },
  { nivel: "A2", titulo: "Bar and Beverage Service", lecciones: ["Vocabulario de bebidas y coctelería básica", "Verificar edad para alcohol", "Servir responsablemente"] },
];

// ─── TÉCNICOS EN COMPUTACIÓN (+37: A2+19, B1+18) — curso nuevo. ────────────
const TECNICOS_PC: CapituloSeed[] = [
  { nivel: "A2", titulo: "Computer Hardware Basics", lecciones: ["Partes de una computadora", "Periféricos comunes", "Vocabulario de cables y conexiones", "Almacenamiento: discos y memoria"] },
  { nivel: "A2", titulo: "Common Software Issues", lecciones: ["Vocabulario de sistema operativo", "Errores comunes y mensajes de error", "Actualizaciones y drivers"] },
  { nivel: "A2", titulo: "Taking a Support Call", lecciones: ["Saludar y pedir información del problema", "Preguntas de diagnóstico básico", "Verificar la identidad del cliente"] },
  { nivel: "A2", titulo: "Basic Troubleshooting Steps", lecciones: ["Reiniciar y verificar conexiones", "Explicar pasos simples al cliente", "Escalar un problema"] },
  { nivel: "A2", titulo: "Writing a Support Ticket", lecciones: ["Vocabulario de tickets de soporte", "Describir el problema por escrito", "Prioridad y SLA"] },
  { nivel: "A2", titulo: "Networking Basics", lecciones: ["Vocabulario de redes (wifi, router, IP)", "Problemas comunes de conexión", "Configurar wifi paso a paso"] },
  { nivel: "B1", titulo: "Remote Support", lecciones: ["Conectarse remotamente al equipo del cliente", "Explicar acciones mientras las realizas", "Pedir permiso para hacer cambios"] },
  { nivel: "B1", titulo: "Explaining Technical Issues Simply", lecciones: ["Traducir jerga técnica a lenguaje simple", "Analogías para explicar problemas", "Manejar clientes frustrados"] },
  { nivel: "B1", titulo: "Software Installation and Licensing", lecciones: ["Vocabulario de instalación", "Licencias y activación", "Errores de instalación comunes"] },
  { nivel: "B1", titulo: "Data Backup and Security", lecciones: ["Vocabulario de respaldo de datos", "Buenas prácticas de seguridad", "Explicar un ataque de phishing"] },
  { nivel: "B1", titulo: "Hardware Repairs and Warranty", lecciones: ["Diagnosticar falla de hardware", "Vocabulario de garantía técnica", "Cuándo reemplazar vs reparar"] },
  { nivel: "B1", titulo: "Closing a Support Case", lecciones: ["Confirmar que el problema se resolvió", "Documentar la solución", "Encuesta de satisfacción"] },
];

// ─── CALL CENTER (+37: B2+19, C1+18) — curso nuevo. ────────────────────────
const CALL_CENTER: CapituloSeed[] = [
  { nivel: "B2", titulo: "Opening a Call Professionally", lecciones: ["Saludo estándar y verificación de identidad", "Establecer el tono de la llamada"] },
  { nivel: "B2", titulo: "Active Listening Techniques", lecciones: ["Frases de escucha activa", "Parafrasear el problema del cliente"] },
  { nivel: "B2", titulo: "De-escalating Angry Customers", lecciones: ["Frases para calmar a un cliente molesto", "Empatía sin prometer de más", "Manejar amenazas de queja pública", "Mantener la calma bajo presión"] },
  { nivel: "B2", titulo: "Hold and Transfer Etiquette", lecciones: ["Poner en espera correctamente", "Transferir una llamada sin perder al cliente"] },
  { nivel: "B2", titulo: "Upselling and Retention", lecciones: ["Ofrecer productos adicionales", "Retener a un cliente que quiere cancelar", "Negociar un descuento sin autorización excesiva", "Cuándo dejar ir al cliente"] },
  { nivel: "B2", titulo: "Handling Difficult Questions", lecciones: ["Responder cuando no sabes la respuesta", "Explicar políticas de la empresa", "Manejar preguntas fuera de tu alcance"] },
  { nivel: "B2", titulo: "Wrap-up and Documentation", lecciones: ["Cerrar la llamada profesionalmente", "Documentar notas de la llamada"] },
  { nivel: "C1", titulo: "Advanced Negotiation on Calls", lecciones: ["Lenguaje persuasivo avanzado", "Manejar objeciones complejas", "Cerrar acuerdos por teléfono"] },
  { nivel: "C1", titulo: "Cultural Sensitivity on International Calls", lecciones: ["Diferencias culturales en comunicación telefónica", "Ajustar el tono según la región", "Evitar malentendidos culturales comunes"] },
  { nivel: "C1", titulo: "Handling Escalations", lecciones: ["Cuándo y cómo escalar una llamada", "Comunicarse con un supervisor durante la llamada", "Documentar una escalación"] },
  { nivel: "C1", titulo: "Complex Complaint Resolution", lecciones: ["Investigar un problema complejo en vivo", "Ofrecer soluciones creativas", "Seguimiento post-resolución"] },
  { nivel: "C1", titulo: "Quality Assurance Language", lecciones: ["Vocabulario de KPIs y métricas de call center", "Autoevaluación de llamadas", "Feedback entre compañeros"] },
  { nivel: "C1", titulo: "Idioms and Nuance in Customer Service", lecciones: ["Modismos comunes en servicio al cliente", "Sarcasmo y tono: qué evitar", "Registro formal vs coloquial"] },
];

export const CURSOS: CursoSeed[] = [
  { cursoSlug: "ingles-general", cursoTitulo: "Inglés General", cursoDescripcion: "", cursoNivel: "A1", cursoTrack: "general", rutaSlug: "general", capitulos: GENERAL },
  { cursoSlug: "ingles-talleres-mecanicos", cursoTitulo: "Inglés para Talleres Mecánicos", cursoDescripcion: "", cursoNivel: "oficios", cursoTrack: "mecanica", rutaSlug: "talleres", capitulos: TALLERES },
  { cursoSlug: "ingles-de-oficina", cursoTitulo: "Inglés de Oficina", cursoDescripcion: "", cursoNivel: "B1", cursoTrack: "oficina", rutaSlug: "oficina", capitulos: OFICINA },
  {
    cursoSlug: "ingles-para-viajar",
    cursoTitulo: "Inglés para Viajar",
    cursoDescripcion: "Inglés práctico para moverte, hospedarte y resolver imprevistos viajando al extranjero.",
    cursoNivel: "oficios",
    cursoTrack: "viajar",
    rutaSlug: "viajar",
    capitulos: VIAJAR,
  },
  {
    cursoSlug: "ingles-para-restaurantes",
    cursoTitulo: "Inglés para Restaurantes",
    cursoDescripcion: "Inglés para meseros, anfitriones y staff de restaurante — atender clientes de principio a fin.",
    cursoNivel: "oficios",
    cursoTrack: "restaurantes",
    rutaSlug: "restaurantes",
    capitulos: RESTAURANTES,
  },
  {
    cursoSlug: "ingles-tecnicos-pc",
    cursoTitulo: "Inglés para Técnicos en Computación",
    cursoDescripcion: "Inglés técnico para soporte, diagnóstico y atención a clientes en informática.",
    cursoNivel: "oficios",
    cursoTrack: "tecnicos-pc",
    rutaSlug: "tecnicos-pc",
    capitulos: TECNICOS_PC,
  },
  {
    cursoSlug: "ingles-call-center",
    cursoTitulo: "Inglés para Call Center",
    cursoDescripcion: "Inglés avanzado para atención telefónica: negociación, manejo de quejas y escalaciones.",
    cursoNivel: "oficios",
    cursoTrack: "call-center",
    rutaSlug: "call-center",
    capitulos: CALL_CENTER,
  },
];

async function obtenerOCrearCursoOnline(seed: CursoSeed): Promise<number> {
  const existente = await prisma.cursoOnline.findUnique({ where: { slug: seed.cursoSlug } });
  if (existente) return existente.id;

  const creado = await prisma.cursoOnline.create({
    data: {
      slug: seed.cursoSlug,
      titulo: seed.cursoTitulo,
      descripcion: seed.cursoDescripcion,
      nivel: seed.cursoNivel,
      track: seed.cursoTrack,
      publicado: true,
    },
  });
  console.log(`CursoOnline creado: ${seed.cursoTitulo} (ID: ${creado.id})`);
  return creado.id;
}

interface StatsCurso {
  capitulosCreados: number;
  leccionesCreadas: number;
  leccionIdsNuevas: number[];
}

async function seedCapitulosYLecciones(cursoOnlineId: number, capitulos: CapituloSeed[]): Promise<StatsCurso> {
  const stats: StatsCurso = { capitulosCreados: 0, leccionesCreadas: 0, leccionIdsNuevas: [] };

  const ultimoCapitulo = await prisma.capitulo.findFirst({
    where: { cursoOnlineId },
    orderBy: { orden: "desc" },
  });
  let ordenCapitulo = (ultimoCapitulo?.orden ?? 0) + 1;

  for (const cap of capitulos) {
    let capitulo = await prisma.capitulo.findFirst({
      where: { cursoOnlineId, titulo: cap.titulo },
    });

    if (!capitulo) {
      capitulo = await prisma.capitulo.create({
        data: { cursoOnlineId, titulo: cap.titulo, nivel: cap.nivel, orden: ordenCapitulo },
      });
      ordenCapitulo += 1;
      stats.capitulosCreados += 1;
    }

    const conSlugs = generarSlugsUnicos(cap.lecciones);
    const ultimaLeccion = await prisma.leccion.findFirst({
      where: { capituloId: capitulo.id },
      orderBy: { orden: "desc" },
    });
    let ordenLeccion = (ultimaLeccion?.orden ?? 0) + 1;

    for (const { titulo, slug } of conSlugs) {
      const existente = await prisma.leccion.findFirst({ where: { capituloId: capitulo.id, titulo } });
      if (existente) continue;

      const creada = await prisma.leccion.create({
        data: {
          capituloId: capitulo.id,
          titulo,
          slug,
          orden: ordenLeccion,
          esGratis: false,
          content: Prisma.JsonNull,
        },
      });
      ordenLeccion += 1;
      stats.leccionesCreadas += 1;
      stats.leccionIdsNuevas.push(creada.id);
    }
  }

  return stats;
}

async function asegurarRutaLeccion(rutaId: number, leccionIds: number[]): Promise<number> {
  let vinculadas = 0;
  for (const leccionId of leccionIds) {
    const existente = await prisma.rutaLeccion.findUnique({
      where: { rutaId_leccionId: { rutaId, leccionId } },
    });
    if (existente) continue;
    await prisma.rutaLeccion.create({ data: { rutaId, leccionId } });
    vinculadas += 1;
  }
  return vinculadas;
}

async function main(): Promise<void> {
  let totalCapitulos = 0;
  let totalLecciones = 0;
  const resumen: string[] = [];

  for (const cursoSeed of CURSOS) {
    const cursoOnlineId = await obtenerOCrearCursoOnline(cursoSeed);
    const stats = await seedCapitulosYLecciones(cursoOnlineId, cursoSeed.capitulos);

    const ruta = await prisma.ruta.findUnique({ where: { slug: cursoSeed.rutaSlug } });
    let vinculadas = 0;
    if (ruta) {
      vinculadas = await asegurarRutaLeccion(ruta.id, stats.leccionIdsNuevas);
    } else {
      console.warn(`Aviso: Ruta "${cursoSeed.rutaSlug}" no encontrada — lecciones creadas sin RutaLeccion.`);
    }

    totalCapitulos += stats.capitulosCreados;
    totalLecciones += stats.leccionesCreadas;
    resumen.push(
      `${cursoSeed.cursoTitulo}: +${stats.capitulosCreados} capítulos, +${stats.leccionesCreadas} lecciones, +${vinculadas} RutaLeccion`
    );
  }

  console.log("\n--- Resumen seed-curriculum-500 ---");
  for (const linea of resumen) console.log(linea);
  console.log(`\nTotal capítulos nuevos: ${totalCapitulos}`);
  console.log(`Total lecciones nuevas: ${totalLecciones}`);

  const totalPlataforma = await prisma.leccion.count();
  console.log(`Total lecciones en la plataforma ahora: ${totalPlataforma}`);
}

// Guard: solo corre el seed si el archivo se ejecuta directamente (no al
// importar CURSOS/tipos desde otro script, ej. generar-tasks-500.ts).
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
