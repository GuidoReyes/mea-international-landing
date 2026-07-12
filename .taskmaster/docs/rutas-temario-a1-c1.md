# PRD — Rutas de aprendizaje (Track) + temario completo A1-C1

## Adaptaciones obligatorias respecto al prompt original

El prompt fuente usa `Course/Chapter/Lesson/Track/TrackLesson` en inglés y
asume que existen así. El repo real usa **español**: `CursoOnline`, `Capitulo`,
`Leccion` (ver `backend/prisma/schema.prisma`). Mapeo de nombres para TODO
este PRD:

| Prompt original | Usar en su lugar |
|---|---|
| `Track` | `Ruta` (modelo nuevo) |
| `TrackLesson` | `RutaLeccion` (modelo nuevo, M2M) |
| `Chapter.level` | `Capitulo.nivel` (campo nuevo `String`, ej. "A1") |
| PKs `String @default(cuid())` | `Int @id @default(autoincrement())` — igual que TODO el resto del schema (`CursoOnline`, `Capitulo`, `Leccion` ya usan Int) |
| Colores `#1F3D61`/`#D96371` | `#0A2540`/`#00C4B4` — paleta real de MEA (`app/globals.css`), NO inventar otra |
| `GET /api/tracks/:slug/curriculum` | `GET /api/rutas/:slug/curriculum` |

## Decisión de arquitectura: Ruta como capa de curación, NO reemplaza CursoOnline

El acceptance criterion del prompt original dice explícitamente "Migración
corre sin romper Course/Lesson/Enrollment existentes" — es decir, la intención
es ADITIVA. Por eso:

- `InscripcionOnline`, `ProgresoLeccion`, `CertificadoOnline` (ya en
  producción desde Fase 2) **NO cambian**. Siguen referenciando
  `cursoOnlineId` / `leccionId` exactamente igual. El progreso de un alumno
  que estudia por una Ruta especializada sigue apareciendo agrupado por
  `CursoOnline` en `/mis-cursos` — es una simplificación consciente, no un
  bug. Certificado por Ruta queda fuera de este PRD (posible Fase futura).
- `CursoOnline` sigue siendo el dueño real de `Capitulo`→`Leccion` (jerarquía
  1:N sin cambios). `Ruta` es una capa de **curación/catálogo** encima: cada
  `Ruta` (ej. "viajar") apunta a un subconjunto de `Leccion` ya existentes
  (que viven físicamente bajo `CursoOnline` "Inglés General" o bajo cursos
  especializados) vía la tabla puente `RutaLeccion`, sin duplicar filas.
- El `CursoOnline` sembrado en Fase 1 con slug `ingles-general-a1` (solo
  nivel A1) se **expande**: se le agregan capítulos de A2 a C1 (con
  `Capitulo.nivel` marcando cada uno) y se renombra su slug a
  `ingles-general` / título a "Inglés General" (update, no genera fila
  nueva — `InscripcionOnline` referencia el `id`, no el slug, así que renombrar
  el slug no rompe nada). Los `CursoOnline` `ingles-talleres-mecanicos` e
  `ingles-de-oficina` ya sembrados en Fase 1 **no se tocan** — sus capítulos y
  lecciones actuales quedan intactos; las Rutas "talleres" y "oficina" los
  referencian vía `RutaLeccion` junto con lecciones tomadas del pool general.

## Modelo de datos (Prisma) — agregar a `schema.prisma`, no reemplazar nada

```prisma
model Ruta {
  id            Int           @id @default(autoincrement())
  slug          String        @unique // "general" | "talleres" | "oficina" | "viajar" | "restaurantes" | "tecnicos-pc" | "call-center"
  titulo        String
  descripcion   String        @db.Text
  nivelMinimo   String        // "A1"
  nivelMaximo   String        // "C1"
  icono         String?       // nombre de ícono lucide-react
  orden         Int           @default(0)
  publicada     Boolean       @default(false)
  proximamente  Boolean       @default(false)
  lecciones     RutaLeccion[]
}

model RutaLeccion {
  rutaId    Int
  ruta      Ruta    @relation(fields: [rutaId], references: [id])
  leccionId Int
  leccion   Leccion @relation(fields: [leccionId], references: [id])
  orden     Int     @default(0)

  @@id([rutaId, leccionId])
  @@index([leccionId])
}
```

Y en el modelo `Leccion` ya existente agregar la relación inversa
`rutas RutaLeccion[]`. En `Capitulo` agregar `nivel String` (default
transitorio `"A1"` para no romper filas existentes al migrar, luego
corregido por el seed).

## Backend — nuevas rutas Express

1. `GET /api/rutas` — catálogo público (7 rutas publicadas), igual patrón que
   `GET /api/cursos-online` (resumen: slug, titulo, descripcion, nivelMinimo,
   nivelMaximo, icono, proximamente, totalLecciones). Cachear en Redis igual
   que las rutas existentes.
2. `GET /api/rutas/:slug/curriculum` — devuelve las lecciones curadas de esa
   ruta, reconstruyendo la agrupación por `Capitulo` (cada `Leccion` ya sabe
   su `capitulo`) y ordenando por `Capitulo.nivel` cuando la ruta es
   "general" (para las tabs A1-C1). Mismo criterio de acceso que
   `cursos-online.ts` (esGratis o suscripción activa → `bloqueada`,
   `urlContenido`), con `optionalAlumnoJWT` para incluir `completada`/
   `puntaje` si hay sesión.

## Frontend — reemplaza el catálogo actual, no lo duplica

`lib/rutas.ts` (nuevo, mismo patrón que `lib/cursos-online.ts`): fetchers
`getRutas()`, `getRutaCurriculum(slug)`.

- `app/cursos/page.tsx`: en vez de listar `CursoOnline` con tabs por
  `track` (como quedó en Fase 1), lista las 7 `Ruta` como cards — título,
  badge de nivel (verde si A1-A2, ámbar si B1-B2, rojo si incluye C1),
  número de lecciones, descripción de 1 línea, orden por `Ruta.orden`
  (general primero).
- `app/cursos/[slug]/page.tsx`: resuelve por slug de `Ruta`. Si
  `slug === "general"`: tabs A1|A2|B1|B2|C1 (pills, colores MEA), cada tab
  con acordeones de capítulo → lecciones (candado si bloqueada, check si
  completada). Si es una ruta especializada: badge "Nivel: {nivelMinimo}–
  {nivelMaximo}" + sección corta "¿Por qué este nivel?" + lista de
  capítulos sin tabs.
- Lecciones enlazan a `/cursos/[rutaSlug]/leccion/[leccionSlug]` — la página
  de lección ya existente (`LeccionClient.tsx`) debe poder resolver la
  lección buscándola dentro del curriculum de la Ruta (por
  `GET /api/rutas/:slug/curriculum`) en vez de `GET /api/cursos-online/:slug`;
  las acciones "inscribirme"/"completar" siguen operando sobre el
  `cursoOnlineId`/`leccionId` reales de esa lección (sin cambios en esos
  endpoints).

## Seed del temario (`backend/src/scripts/seed-curriculum.ts`)

Insertar el temario COMPLETO de abajo como `Capitulo` (con su `nivel`) +
`Leccion` (solo `titulo` + `urlContenido: null`; el `content` interactivo de
la Fase de LessonPlayer se genera después, por separado, con
`generate-leccion.ts`). Cada celda "Lecciones clave" de las tablas de abajo,
separada por comas, es UNA `Leccion` (mecánico: dividir por coma/punto y
coma). El capítulo (fila completa) es UN `Capitulo`. Slugs: kebab-case del
título en inglés, ascii, único dentro de su capítulo.

Idempotente (upsert por slug, igual patrón que `seed-cursos-online.ts`):
correr dos veces no debe duplicar nada.

Todos los capítulos A1-C1 de abajo van bajo `CursoOnline` slug
`ingles-general` (renombrar el existente `ingles-general-a1` → `ingles-general`,
actualizar título a "Inglés General", conservar sus 2 capítulos A1 ya
sembrados si coinciden temáticamente con la tabla de abajo — evitar
duplicarlos).

### A1 — Principiante

| Capítulo | Lecciones clave |
|---|---|
| Welcome / Greeting a Friend | Saludar a un amigo |
| Hello and Goodbye | Pronombres (I, you, he...), verbo To Be, How are you?, saludos/despedidas |
| Where Are You From? | Nacionalidades, To Be negativo e interrogativo |
| Welcome! | Vocales, To Have, artículos a/an, repaso |
| What's Your Number? | Números 1-10, 11-20, 20-100, How many?, intercambiar teléfonos |
| Classes and Courses | Sustantivos plurales (regulares e irregulares) |
| The Weather | Clima, temperatura, intro a adjetivos |
| At the Beach | This/That/These/Those, Here/There, vocabulario playa |
| Check-in at the Hotel | There is/are, vocabulario hotel, preposiciones de lugar |
| At the Hotel | There is/are negativo e interrogativo, tours, buffet |
| At the Train Station (1 y 2) | Presente simple (+/-/?), verbos comunes, vocabulario tren |
| What Time Is It? | Números 1-60, la hora (o'clock, half past, quarter to) |
| Seasons | Estaciones, partes del día, días de la semana, preposiciones de tiempo |
| What's Your Address? | Números 100-10,000, direcciones |
| What's the Date? | Meses, números ordinales, fechas, años |
| At the Market | Frutas/verduras, contables/incontables, some/any |
| At the Pharmacy | Vocabulario farmacia, To Have Got |
| How Do You Get to...? | Preguntas con question words, verbo To Get, direcciones |
| What Are You Doing These Days? | Presente continuo, futuro con presente continuo |
| Catching the Bus | Tomar el bus |
| At the Bank | Cantidades (how much/many), vocabulario banco |
| At the Newsstand | Intensificadores |
| Planning a Trip | Futuro con going to |
| At the Restaurant | Vocabulario restaurante, would like (+/-/?) |
| I Want to Buy a New Computer | Vocabulario de computación, to like + gerundio/infinitivo |
| My Travel Blog | Was/Were |
| Could I Take a Tour? | Can/Can't/Could |
| Sightseeing | Pasado simple, pronunciación -ed |
| A Football Match | Pasado: pregunta y negación, vocabulario fútbol |
| Looking For a Flat / At the Cinema | Verbos irregulares en pasado |

### A2 — Elemental

| Capítulo | Lecciones clave |
|---|---|
| Welcome to Mexico City! | Contables/incontables, a lot of / much / many |
| Working in the Garden | Some/any, a vs an |
| Moving House | Mi casa, preposiciones in/at/on (lugar) |
| Scheduling Classes | Expresiones de tiempo, in/at/on (tiempo) |
| A Drive Through the Mountains | Preposiciones de movimiento |
| Is That Yours? | Posesivos (adjetivos y pronombres), its/it's, their/there/they're |
| The Melting Pot | Familia, migración, 's posesiva |
| Visiting a Museum | Comparativos (4 partes), arte y museos |
| The Award Show | Superlativos, the best/the worst |
| A Thanksgiving Celebration | Adverbios de frecuencia |
| Taking Pictures With Friends | Números 0-999, gerundios, fotografía |
| A Five Thousand Kilometer Flight | Números grandes, hablar de un viaje |
| A Trip to Wales / A Summer Party | Futuro going to / will, geografía UK |
| If It Rains | Primer condicional |
| A Job Interview | Have to, preparación de entrevista de trabajo |
| Cooking With Friends | Vocabulario cocina, imperativo |
| What Would You Like to Eat? | Pedidos, would like vs want vs like |
| How Do You Stay Fit? | Fitness, preguntas con How |
| The News | Noticias, should/shouldn't |
| Hi, I'm Texting You | Presente continuo |
| Merry Christmas! | Presente continuo para futuro |
| A Trip to Scotland | Pasado simple completo, was/were |
| Not Feeling Well | Vocabulario de enfermedad, pasado continuo |
| I Visited My Hometown | Pasado continuo vs pasado simple |
| Getting Ready for Work | Phrasal verbs comunes |
| Have You Ever...? | Presente perfecto (+/-/?) |
| A Shopping Trip | Can/could para habilidades |
| What Do You Do When It Rains? | Condicional cero |

### B1 — Intermedio

| Capítulo | Lecciones clave |
|---|---|
| First Day on the Job | Presente simple vs continuo (repaso aplicado a trabajo) |
| A Trip to the Cabin | In/on/at para tiempo |
| How Did Your Presentation Go? | Vocabulario de oficina, pasado (repaso) |
| How We Met | Pasado continuo vs simple |
| Opening a New Office | Ubicación |
| A Remodeling Dispute | Futuro con will, usos especiales |
| A Delayed Delivery | Artículos a/an/the, vocabulario de entregas |
| Having Friends Over | Enough / too much |
| Onboarding | Vocabulario onboarding, futuro con going to |
| Better Vacation Destination | Comparativos, as...as |
| Looking for Work | Presente para hablar de futuro, búsqueda de empleo |
| Shall We Go to the Opera? | Shall, sugerencias |
| Following Up With Clients | Presente perfecto; yet/already/still/just |
| Have You Been to Italy? | Presente perfecto vs pasado simple |
| Climate Change | Condicional cero y primero, unless |
| If I Won the Lottery | Segundo condicional |
| What's Your Commute Like? | Subject questions, commuting |
| A Flight Confirmation | Must & have to |
| My Family Photo Album | Relative clauses |
| Meeting a Deadline | Pasado perfecto, deadlines |
| Asking for Directions | Preguntas indirectas |
| Things Used to Be Different | Used to, would para hábitos pasados |
| The Recycling Process | Voz pasiva |
| Asking for a Promotion | Reported speech, pedir aumento |
| How About We Get Dinner? | Formas de sugerir |
| Delegating Tasks | Verbos causativos, delegar |

### B2 — Intermedio Alto

| Capítulo | Lecciones clave |
|---|---|
| Where Could My Keys Be? | Deducciones (must/can't, may/might/could) |
| Job Interviews Lately | Vocabulario ventas, presente perfecto continuo |
| I Used to Drink Too Much | Used to vs would |
| Getting Used to the Office | Be used to / get used to |
| I Forgot My Passport! | Pasado perfecto |
| A Quarterly Update | Vocabulario de crecimiento, informes trimestrales |
| She Said She Had Studied | Reported speech en pasado |
| Dealing With a Difficult Client | As if / as though, cliente difícil |
| I Wish I Had Asked... | Deseos en pasado |
| By the End of the Year | Futuro perfecto, crecimiento corporativo |
| Planning a Barbecue | Both/either/neither |
| The Deal Fell Through | Deducciones en pasado, negociación |
| History of the Telephone | Voz pasiva en pasado |
| Despite the Risks | Contraste de ideas, startup vs corporativo |
| He Can't Make Me Study | Make and let |
| You've Done Such a Great Job | So/such, performance review |
| Whatever Store Is Fine | Whoever/whatever/wherever... |
| I Wasn't Able to Catch My Flight | Habilidades en pasado, viajes de negocios |
| If I Could, I Would Move to Paris | Segundo condicional |
| An Interpersonal Dispute | Tercer condicional, conflictos |
| The Storm of the Century | Futuro continuo |
| A Company That Provides Solutions | Defining relative clauses |
| What an Awful Morning | Pasado perfecto continuo |

### C1 — Avanzado

| Capítulo | Lecciones clave |
|---|---|
| If I Hadn't Bought That Car | Condicionales mixtos |
| Let's Open a Restaurant | Futuro perfecto continuo |
| Never Have I Had a Worse Date | Inversiones (Never have I..., Little did he know...) |
| What Shaped My Career Was... | Cleft sentences (It/What) |
| Despite the Danger | In spite of/despite, although/even though |
| Two Different Managers | Even if, while/whereas, much as, liderazgo |
| This Dog Might Be Lost | Modales de certeza e incertidumbre |
| Long Day at the Office / Waiting Long? | Elipsis (omisión de palabras, 4 lecciones) |
| Never Had We Expected This | Inversiones con no/not, vocabulario de auditoría |
| A College Tour | Posesión avanzada, noun modifiers |
| What Are You Working On? | Vocabulario marketing, stative verbs |
| Were We to Adopt a Dog | Inversión en condicionales 2 y 3 |
| The Upcoming Recession | Perfectos en contraste, vocabulario de recesión |
| The Dreaded Move | Past perfect vs past perfect continuous |
| The End-of-Year Party | Have/let/make/get, planificación de eventos |
| Welcome to Rome! | Voz pasiva completa + con modales |
| It's Been Reported That... | Pasiva impersonal |
| I Suggest They Take It Easy | Subjuntivo para recomendaciones |
| We Need a New Manager | If contrafactual |
| I Wish I Were More Disciplined | Wishes |
| What a Transformation | Exclamaciones what/how |
| Did You Hear...? | Omisión de "that" |

## Matriz de asignación a Rutas (RutaLeccion) — reglas exactas

- **general**: TODAS las lecciones A1→C1 de las tablas de arriba.
- **viajar** (A1–A2): capítulos A1 de hotel, tren, bus, restaurante, banco,
  farmacia, mercado, direcciones, hora, fechas, sightseeing + capítulos A2 de
  viajes, vuelos y pedir comida.
- **restaurantes** (A1–A2): capítulos A1 de saludos, números, hora,
  restaurante, some/any + A2 de pedidos, imperativo y cocina.
- **talleres** (A1–A2): capítulos A1 de saludos, números, hora, fechas,
  direcciones, presente simple, can/could + A2 de imperativo, should, have
  to, pasado simple y condicional 1, MÁS las lecciones ya propias sembradas
  en Fase 1 bajo `ingles-talleres-mecanicos` (no tocarlas, solo agregarlas a
  `RutaLeccion`).
- **oficina** (A2–B1): A2 entrevista de trabajo, phrasal verbs, presente
  perfecto + B1 completo de capítulos laborales, MÁS las lecciones ya propias
  sembradas en Fase 1 bajo `ingles-de-oficina`.
- **tecnicos-pc** (A2–B1): A1 computer vocabulary + A2 presente
  continuo/pasado/should + B1 indirectas, presente perfecto, pasiva, relative
  clauses.
- **call-center** (B2–C1, mínimo B2): B1 reported speech e indirectas + B2
  completo de capítulos de clientes/negociación + C1 pasiva impersonal,
  subjuntivo, modales de certeza.

## Criterios de aceptación

- [ ] Migración de Prisma corre sin romper `InscripcionOnline`,
      `ProgresoLeccion`, `CertificadoOnline` existentes.
- [ ] Seed inserta el temario completo (A1-C1) y las asignaciones
      `RutaLeccion` según la matriz de arriba, de forma idempotente.
- [ ] `/cursos` muestra las 7 cards de Ruta con su badge de nivel.
- [ ] `/cursos/general` muestra tabs A1-C1 con acordeones de capítulo.
- [ ] `/cursos/call-center` muestra badge "B2–C1" con el contenido descrito
      arriba (incluye el puente B1 de reported speech/indirectas).
- [ ] Una lección aparece en múltiples rutas sin duplicarse en la DB
      (verificable: mismo `leccionId` en más de una fila de `RutaLeccion`).
- [ ] Nada del bot de WhatsApp, CRM, dashboard admin, `InscripcionOnline`/
      `CertificadoOnline`/`ProgresoLeccion` existentes se rompe.
