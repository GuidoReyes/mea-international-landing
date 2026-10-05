# PRD — Lógica de negocio real: pagos por sesión, asistencia Zoom y panel admin

Version: 1.0
Fecha: 2026-10-01
Tag Task Master: `mea-logica-negocio`
Antecede: mapas de experiencia del alumno y del admin (misma sesión, artifacts publicados), `seo-mea-fase4`/`fase5`
Driver: dueño del negocio (contexto de producto aportado directamente, 2026-10-01)

## 1. Contexto real del negocio (no estaba modelado en el código)

- El pago hoy es **depósito manual**, en su mayoría coordinado por WhatsApp: el alumno transfiere y envía el comprobante; un admin lo confirma manualmente.
- Lo que se vende es **un bloque de 8 sesiones de inglés**, no "un mes" de acceso calendario. Si una sesión se atrasa (feriado, alumno, profesor), el siguiente pago también se atrasa — el ciclo lo marca la entrega real de sesiones, no el calendario.
- Las clases son **100% virtuales por Zoom**, sin modalidad presencial.
- El **control manual de acceso al contenido debe seguir en manos del admin**, como ya funciona hoy — no se pide automatizarlo ni quitárselo.
- Lo que sí se puede mejorar es **qué datos ve el admin** para tomar esa decisión: última fecha de pago, sesiones recibidas, y una forma de llevar asistencia real a las sesiones de Zoom (hoy no existe ningún registro de quién se conectó).

## 2. Causa raíz confirmada en el código (no es una suposición)

El síntoma "alumno con acceso pagado no puede entrar" tiene una causa estructural, no solo de interfaz:

- `backend/prisma/schema.prisma` — `PlanPrecio.duracionMeses` (1, 3, 6, 12) es la **única** unidad de tiempo que existe en todo el modelo de datos. No hay ningún campo que cuente sesiones.
- `backend/src/routes/pagos-deposito.ts:79` — al confirmar un depósito, el sistema calcula `fechaFin = hoy + duracionMeses` **sin importar cuántas sesiones se entregaron realmente**. Si las 8 sesiones se atrasan por cualquier motivo, el acceso igual se corta en la fecha calendario.
- `backend/src/routes/alumnos.ts:222-247` — el botón "Dar acceso manual" del admin **sí** está bien diseñado para este negocio: crea una `Suscripcion` con `proveedor: "manual_admin"` y `fechaFin: null` (sin vencimiento automático) — el admin decide cuándo cortarla. Este es el mecanismo correcto y se mantiene.
- El problema es que el flujo de **depósito confirmado por el propio alumno** (`manual_deposito`, el más común) no usa ese mecanismo sin fecha — usa el cálculo calendario de la línea anterior, que no corresponde a lo que realmente se vendió.
- `app/admin/alumnos/[id]/page.tsx:402,434,441` — el badge y el botón del panel admin solo miran `estado === "ACTIVA"`, nunca la fecha ni las sesiones — así que aunque se corrija el cálculo de abajo, el admin sigue sin ver la información real para decidir.

## 3. Objetivo

Alinear el sistema con cómo se vende y se entrega el servicio de verdad: pagos por bloque de 8 sesiones verificados a mano, acceso decidido por el admin con datos reales delante (no una fecha calendario ciega), y una forma de registrar asistencia a Zoom sin depender de la memoria de nadie.

## 4. No objetivos

- No automatizar la verificación de pagos — sigue siendo manual por WhatsApp/comprobante.
- No quitarle al admin la decisión final de activar/desactivar acceso — se queda exactamente como está.
- No construir facturación recurrente tipo SaaS — el negocio no se vende así.
- No tocar el flujo de pago con tarjeta (Recurrente), que sí es genuinamente una suscripción calendario recurrente real — ese modelo de fecha sí le corresponde.
- No inventar porcentajes de asistencia, cifras de retención ni ningún dato que no salga de un registro real.

## 5. Requisitos funcionales

### R1 — Modelar la sesión como la unidad real del producto
Nuevos modelos Prisma:
- `SesionClase`: ocurrencia concreta de una clase (grupo, fecha/hora real, estado PROGRAMADA/REALIZADA/CANCELADA/REPROGRAMADA). Se genera desde `HorarioClase` (la plantilla semanal que ya existe) o se crea manualmente para reprogramaciones.
- `AsistenciaSesion`: alumno + sesión + asistió (boolean) + fuente (`zoom_webhook` | `manual`) + marcadoEn.
- Un contador de "sesiones del bloque vigente consumidas / 8" por alumno, derivado de `AsistenciaSesion`, no de una fecha.

**Criterios de aceptación:** cada `HorarioClase` activo genera sus próximas `SesionClase` automáticamente (job o al confirmar pago); una sesión cancelada/reprogramada no cuenta contra el bloque de 8; el conteo es consultable por alumno.

### R2 — Detectar asistencia a Zoom
Dos caminos, no excluyentes:

- **R2a (automática, bloqueada por datos del dueño):** Zoom Webhooks (`meeting.participant_joined` / `meeting.participant_left`) vía una app Server-to-Server OAuth de Zoom. Requiere que el dueño tenga (o cree) una cuenta Zoom con Marketplace habilitado y comparta Account ID / Client ID / Client Secret / Webhook Secret Token. **Pregunta directa para el dueño, no se asume.**
- **R2b (manual, sin dependencias externas, se puede construir ya):** el profesor o admin marca asistencia al cierre de cada `SesionClase` desde una pantalla simple — lista de alumnos esperados, toggle presente/ausente. Alimenta el mismo modelo `AsistenciaSesion` con `fuente: "manual"`.

**Recomendación:** construir R2b primero (desbloqueada, útil de inmediato); dejar R2a como mejora que se activa sola en cuanto el dueño confirme acceso a la API de Zoom — mismo modelo de datos, solo cambia quién llena `AsistenciaSesion`.

### R3 — Decisión sobre el cálculo de vencimiento en depósitos manuales
`pagos-deposito.ts:79` fija una fecha de corte que no corresponde al negocio. Dos opciones, a decidir con el dueño antes de tocar el código (afecta cómo se corta el acceso, zona sensible):
- **Opción A:** al confirmar el depósito, acreditar 8 sesiones al bloque del alumno en vez de una fecha fija; `fechaFin` queda como dato informativo/estimado, no como corte automático.
- **Opción B (más conservadora, cambia menos):** dejar el cálculo de fecha como está, pero el admin nunca pierde la decisión manual — se apoya en los datos nuevos de R4 para extender el acceso a mano cuando una sesión se atrasó, sin cambiar el código de corte automático.

**No se implementa ninguna de las dos sin confirmar con el dueño cuál prefiere** — es la pieza más sensible de este PRD porque toca el corte de acceso real.

### R4 — Rediseñar la tarjeta de alumno en el CRM/admin
En `app/admin/alumnos/[id]/page.tsx` (y la lista de `/admin/alumnos`), mostrar sin tener que abrir nada más:
- Última fecha de pago confirmada (de `PagoSuscripcion.pagadoEn` o el pago presencial equivalente).
- Sesiones recibidas del bloque vigente (X de 8), con desglose de asistencia reciente (iconos presente/ausente/reprogramada).
- Próxima `SesionClase` programada para ese alumno/grupo.

El botón de acceso manual se mantiene como está (correcto); solo se le agrega esta información al lado para que la decisión sea informada.

**Criterios de aceptación:** ningún dato inventado — si no hay registro de pago o sesión, se muestra "sin datos", nunca un valor supuesto.

### R5 — Vista de asistencia por sesión
Pantalla para el profesor/admin: por cada `SesionClase`, quién estaba esperado y quién asistió. Permite ver de un vistazo si una clase se dio con bajo cupo y decidir si corresponde reprogramar (lo que corre el calendario de pago, consistente con R3).

### R6 — Qué hallazgos de los mapas anteriores cambian con este contexto
- **Se resuelve por diseño, no por parche:** "el campo `estado` queda en ACTIVA aunque venció" — bajo este modelo, la fecha deja de ser la señal de confiar para depósitos manuales (según lo que se decida en R3); el hallazgo se vuelve irrelevante en vez de necesitar un fix cosmético aislado.
- **Se mantienen igual de válidos, sin relación con el modelo de pago — arreglar aparte:**
  - El reproductor de lecciones falla en silencio (`LeccionClient.tsx:117-119`).
  - "Mis cursos" no muestra nada de la suscripción (sigue aplicando, ahora mostraría sesiones en vez de fecha).
  - Finanzas/CEO no ven `PagoSuscripcion` — más relevante todavía con sesiones como unidad real de ingreso.
  - Lead ↔ Alumno sin ninguna conexión en el schema.
  - Sin panel para editar qué lección pertenece a qué ruta (ruta Talleres).
- **Se descarta:** ningún hallazgo de los dos mapas anteriores pierde sentido de negocio al punto de borrarse — los de UX/código siguen siendo reales independientemente del modelo de pago.

## 6. Preguntas abiertas para el dueño (bloquean R2a y R3)

1. ¿Tenés cuenta de Zoom con capacidad de crear una app Server-to-Server OAuth (Zoom Pro/Business+ con Marketplace habilitado)? Sin esto, R2a queda bloqueada y se construye solo R2b.
2. Para R3: ¿preferís que el sistema acredite sesiones (Opción A, cambia el corte automático) o que todo siga por fecha pero vos extendés a mano cuando se atrasa una clase (Opción B, cambia menos código)?
3. Las 8 sesiones, ¿son siempre grupales (ya existe `GrupoClaseEnVivo`) o también hay sesiones individuales 1:1 que hoy no están en ningún modelo?
4. Cuando se reprograma una sesión, ¿la nueva fecha la decide el admin a mano cada vez, o hay un patrón fijo (ej. "siempre la semana siguiente, mismo horario")?

## 7. Orden sugerido

```
R1 (modelo de sesiones) ──┬── R2b (asistencia manual, ya desbloqueada)
                          ├── R5 (vista de asistencia)
                          └── R4 (tarjeta de alumno en CRM) ── requiere R1 + pago (ya existe)

R2a (Zoom webhook) ── bloqueada, pregunta 1
R3 (cálculo de vencimiento) ── bloqueada, pregunta 2 — no se toca sin decisión del dueño
```

## 8. Definition of Done

- El admin ve, sin salir de la ficha del alumno, cuándo pagó por última vez y cuántas de las 8 sesiones ya recibió.
- Existe un registro real de asistencia por sesión, aunque sea cargado a mano por ahora.
- Nadie pierde la capacidad de otorgar/quitar acceso manualmente — sigue siendo la autoridad final, ahora con mejor información.
- Ninguna cifra de asistencia, pago o sesión se muestra inventada — si falta el dato, se dice que falta.
- R2a y R3 quedan explícitamente bloqueadas hasta la respuesta del dueño, documentadas, sin asumir una decisión en su nombre.
