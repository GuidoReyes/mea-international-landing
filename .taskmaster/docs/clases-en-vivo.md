# PRD — Clases en vivo (grupos recurrentes con gating de Zoom)

## Adaptaciones obligatorias respecto al prompt original

Nomenclatura española + convenciones ya establecidas en el repo real:

| Prompt original | Usar en su lugar |
|---|---|
| `LiveClassGroup` | `GrupoClaseEnVivo` |
| `LiveClassSchedule` | `HorarioClase` |
| PKs `String @default(cuid())` | `Int @id @default(autoincrement())` |
| `src/services/liveClass.service.ts` | `backend/src/lib/horario-clases.ts` (el repo usa `lib/`, no `services/` — ver `lib/suscripciones.ts`, `lib/recurrente.ts`) |
| Jest/Vitest | El repo NO tiene test runner instalado. Seguir el patrón ya usado en
  `backend/src/scripts/test-fase3.ts`: script ejecutable con `ts-node` +
  `assert`, funciones puras con parámetro de tiempo inyectable para poder
  testear casos límite sin mockear relojes. Agregar
  `"test:clases-en-vivo": "ts-node src/scripts/test-clases-en-vivo.ts"` a
  `package.json`. NO instalar Jest/Vitest nuevos. |
| `GET /api/admin/live-classes...` | Seguir el patrón real de rutas admin del repo: protección `verifyJWT` +
  `auditLog(...)` DENTRO del mismo router de recurso (ver `routes/cursos.ts`),
  no un prefijo `/api/admin/` separado — no existe ese patrón en el repo. |
| Colores `#1F3D61`/`#D96371` | `#0A2540`/`#00C4B4` — paleta real de MEA (`app/globals.css`) |
| `hasLiveClasses` en Plan | `incluyeClasesEnVivo Boolean @default(false)` en el modelo `Plan` ya
  existente (`backend/prisma/schema.prisma`, sembrado en Fase 1 con planes
  "esencial"/"profesional"). Actualizar el seed existente
  (`seed-cursos-online.ts`) para marcar `profesional: true`, `esencial: false`
  — es idempotente, correrlo de nuevo no rompe nada. |

## Modelo de datos (Prisma) — agregar, no reemplazar

```prisma
model GrupoClaseEnVivo {
  id              Int                 @id @default(autoincrement())
  slug            String              @unique
  nombre          String
  audiencia       String              // "ninos" | "adolescentes" | "adultos" | "general"
  niveles         String              // "A1" | "A2" | "B2,C1" | "PRE_A1" | "PRE_BEGINNERS" | "A1,A2"
  descripcion     String?             @db.Text
  profesor        String?
  urlZoom         String              // placeholder inicial "https://zoom.us/j/PENDIENTE"
  duracionMinutos Int                 @default(60)
  activo          Boolean             @default(true)
  horarios        HorarioClase[]
}

model HorarioClase {
  id           Int              @id @default(autoincrement())
  grupoId      Int
  grupo        GrupoClaseEnVivo @relation(fields: [grupoId], references: [id])
  diaSemana    Int              // 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
  horaInicio   String           // "HH:mm" 24h, hora de Guatemala

  @@unique([grupoId, diaSemana, horaInicio])
}
```

Y en `Plan`: agregar `incluyeClasesEnVivo Boolean @default(false)`.

## Seed (`backend/src/scripts/seed-clases-en-vivo.ts`, patrón idéntico a
`seed-cursos-online.ts`: arrays estáticos, upsert por slug, idempotente)

8 grupos, 16 horarios (America/Guatemala, sin horario de verano):

| Días | Hora inicio | Grupo (slug) | Audiencia | Niveles |
|---|---|---|---|---|
| Lun, Mié | 17:00 | Basic Niños (`basic-ninos`) | ninos | A1 |
| Lun, Mié | 18:20 | Básico 2 Adolescentes (`basico-2-adolescentes`) | adolescentes | A2 |
| Lun, Mié | 19:20 | Advance Conversacional (`advance-conversacional`) | adultos | B2,C1 |
| Lun, Mié | 20:30 | Basic Adultos (`basic-adultos`) | adultos | A1,A2 |
| Mar, Jue | 09:30 | Starters (`starters`) | general | PRE_BEGINNERS |
| Mar, Jue | 16:00 | Cubs (`cubs`) | ninos | A1 |
| Mar, Jue | 17:00 | Smarties (`smarties`) | ninos | PRE_A1 |
| Mar, Jue | 19:00 | Adults (`adults`) | adultos | PRE_A1 |

`duracionMinutos`: 60 para todos (default explícito del prompt — Guido
confirma el valor real después, editable desde el admin sin redeploy).
`urlZoom`: `"https://zoom.us/j/PENDIENTE"` para los 8 — NUNCA hardcodear URLs
reales; Guido las carga desde el admin cuando las tenga.

## Lógica de tiempo (`backend/src/lib/horario-clases.ts`)

Usar `Intl.DateTimeFormat` con `timeZone: "America/Guatemala"` (NUNCA offset
manual ni la hora del servidor — Railway corre en UTC). Guatemala no tiene
horario de verano, pero igual usar Intl para no hardcodear el offset.

Funciones puras, con parámetro de tiempo inyectable para testear sin mockear
relojes globales (mismo patrón que `agregarMeses`/`verificarFirmaWebhook` en
`lib/recurrente.ts`):

```typescript
export function obtenerAhoraGuatemala(fecha: Date = new Date()): { diaSemana: number; minutos: number } { ... }

export function estaEnVivo(
  horario: { diaSemana: number; horaInicio: string },
  duracionMinutos: number,
  ahora: { diaSemana: number; minutos: number }
): boolean { ... }

export function obtenerClasesEnVivo(
  grupos: GrupoConHorarios[],
  ahora: { diaSemana: number; minutos: number }
): ClaseEnVivo[] { ... }

// Menor distancia futura en la semana (hoy después de ahora → resto de la
// semana → envolver a la semana siguiente si hace falta).
export function obtenerProximaClase(
  grupos: GrupoConHorarios[],
  ahora: { diaSemana: number; minutos: number }
): ProximaClase | null { ... }
```

## Tests (`backend/src/scripts/test-clases-en-vivo.ts`, patrón `test-fase3.ts`)

Casos obligatorios (usar `assert`, no framework nuevo):
- Clase en vivo (dentro de la ventana horaInicio..horaInicio+duracion).
- Justo al terminar (minuto exacto de corte, ambos lados del límite).
- Próxima clase cuando hoy es jueves 21:00 → debe dar lunes de la semana
  siguiente (envolver la semana).
- Ningún grupo activo → `obtenerClasesEnVivo` devuelve `[]`,
  `obtenerProximaClase` devuelve `null`.
- Servidor en UTC no debe afectar el resultado (pasar fechas construidas en
  UTC y verificar que `obtenerAhoraGuatemala` calcula correctamente el
  desfase de -6h).

## Backend — endpoints

1. `GET /api/clases-en-vivo/horario` — público. Horario semanal completo
   (grupo, día, hora, niveles, audiencia, profesor) + `liveNow[]` +
   `nextClass`, calculados con la lógica de arriba. **`urlZoom` JAMÁS se
   incluye en esta respuesta** — filtrar explícitamente el campo al serializar,
   no confiar en que el frontend no lo muestre.
2. `GET /api/clases-en-vivo/:grupoId/entrar` — requiere `verifyAlumnoJWT` +
   `tieneSuscripcionConClasesEnVivo(alumnoId)` (nueva función en
   `lib/suscripciones.ts`: extiende el check de `tieneSuscripcionActiva` para
   además unir con `planPrecio.plan.incluyeClasesEnVivo`; NO modificar
   `tieneSuscripcionActiva` existente, que sigue usándose sin cambios para
   desbloquear lecciones). Sin plan → 403 `{ reason: "plan_required" }`. Con
   plan pero clase no en vivo (ni empieza en los próximos 10 min) → 409
   `{ reason: "not_live", nextOccurrence }`. Si pasa todo: `{ zoomUrl }`. Rate
   limiting igual patrón que `checkoutAttempts` en `routes/suscripciones.ts`.
   Loguear cada entrada exitosa (alumnoId, grupoId, timestamp) con `log()` de
   `lib/logger.ts` para métricas de asistencia — no hace falta tabla nueva
   para esto en esta fase.
3. Admin CRUD dentro de `routes/clases-en-vivo.ts` (mismo archivo, protegido
   con `verifyJWT` + `auditLog`, patrón `routes/cursos.ts`):
   `POST /api/clases-en-vivo` (crear grupo), `PATCH /api/clases-en-vivo/:id`
   (editar, incluida `urlZoom` — este es el requisito explícito de "admin
   edita sin tocar código"), `POST /api/clases-en-vivo/:id/horarios` (agregar
   horario).

## Frontend — página `/clases-en-vivo`

`lib/clases-en-vivo.ts` (fetcher `getHorarioClases()`, mismo patrón que
`lib/rutas.ts`).

Client component con `setInterval` de 60s que re-llama al endpoint público
(el servidor recalcula `liveNow`/`nextClass` frescos cada vez — evita drift de
reloj en el cliente):

- **Banner "EN VIVO AHORA"**: si `liveNow.length > 0`, card con pulso rojo,
  nombre del grupo, nivel, hora de fin. Botón según estado de sesión: con
  suscripción con clases en vivo → "Entrar a la clase en Zoom" (llama a
  `/entrar`, abre la URL devuelta); sin plan adecuado → "Desbloquear clases en
  vivo" → `/planes`; sin sesión → "Iniciá sesión para entrar" → `/alumno/login`.
  Si no hay clase ahora: card "Próxima clase" con cuenta regresiva.
- **Horario semanal**: columnas Lun/Mar/Mié/Jue (únicos días con clases).
  Cada slot: hora, grupo, badge de audiencia, badge de nivel (gris para
  PRE_A1/PRE_BEGINNERS, verde A1-A2, rojo si incluye B2/C1 — misma lógica de
  color que `colorBadgeNivel` en `lib/rutas.ts`, extendida para los niveles
  "PRE_*"). La clase en vivo se resalta con borde `#00C4B4`.
- **"¿Cómo funcionan?"**: 3 pasos (contratar plan → revisar horario → entrar a
  Zoom desde acá).
- Toda hora mostrada con etiqueta "(hora Guatemala)".

## Integración con lo existente

- En `components/planes/PricingPlanes.tsx`: el feature "Clases en vivo
  ilimitadas" del plan Profesional (ya en el array `features` sembrado en
  Fase 1) debe ser un link a `/clases-en-vivo` — matchear la feature por texto
  (`feature.toLowerCase().includes("clases en vivo")`) y envolverla en
  `<Link>` en vez de cambiar la estructura de datos del plan.
- Recordatorio por WhatsApp 30 min antes (Fase 2, reutilizando
  `lib/whatsapp-send.ts`) queda FUERA de este alcance — no implementar todavía.

## Criterios de aceptación

- [ ] Seed crea los 8 grupos y 16 horarios exactos de la tabla.
- [ ] Lunes 7:30 PM Guatemala → banner "Advance Conversacional EN VIVO".
      Martes 10:00 AM → "Starters" ya no en vivo si duración=60 (empezó 9:30,
      terminó 10:30 — sigue en vivo a las 10:00; ajustar el caso de prueba a
      la duración real usada, 60 min).
- [ ] `urlZoom` nunca aparece en la respuesta de `/horario` (público) —
      verificable inspeccionando el JSON.
- [ ] Alumno con Plan Profesional activo y clase en vivo obtiene `zoomUrl` vía
      `/entrar`. Sin plan adecuado: 403. Clase no en vivo: 409.
- [ ] Tests de `horario-clases.ts` pasan, incluido el caso servidor en UTC y
      el caso "próxima clase cruza a la semana siguiente".
- [ ] Admin puede editar `urlZoom` de un grupo vía `PATCH` sin tocar código
      (endpoint funcional; UI de admin queda como mejora incremental si no
      alcanza el tiempo, documentar si se omite).
- [ ] Nada del bot de WhatsApp/CRM/cursos/rutas existente se rompe.
