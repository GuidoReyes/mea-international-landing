# PRD — Separar "Cursos" y "Planes" en la landing page (mea.edu.gt)

## 0. Contexto real verificado en el repo

El prompt original fue escrito sin acceso al código (solo inspección del sitio publicado). Verificación
hecha en el repo real antes de escribir este PRD:

- La sección de precios actual **no es un componente reutilizable aparte**: vive inline en
  [`app/page.tsx`](../../app/page.tsx), como un array local `courses` (líneas ~115-161) con las 3
  tarjetas (Pre A Q300, B1 B2 Q250, VIP Q1,600), renderizado dentro de `<section id="cursos">`
  (líneas ~563-690). Los badges flotantes "Q100 inscripción" / "Q130 plataforma educativa" y el
  disclaimer al pie están en ese mismo bloque JSX.
- El nav superior está en [`components/ui/navbar-1.tsx`](../../components/ui/navbar-1.tsx), array
  `NAV_LINKS` (líneas 9-15), usado tanto en el menú desktop como en el mobile. El nav del footer está
  duplicado inline en `app/page.tsx` (líneas ~793-799). Ambos deben actualizarse.
- El CTA de todas las tarjetas es un `<a href="https://wa.me/50256311728?text=...">`, no un link interno.

### ⚠️ Decisión de arquitectura importante: dos conceptos distintos llamados "Planes"

Este proyecto ya tiene un sistema de **Planes/Suscripciones respaldado por backend**
(`backend/prisma/schema.prisma`: modelos `Plan`/`PlanPrecio`/`Suscripcion`, rutas `/api/planes`,
`/api/suscripciones`, integración de pago Recurrente, página `/planes` con `PricingPlanes.tsx`), con
2 planes ya sembrados: **Esencial** (Q299/mes) y **Profesional** (Q499/mes, incluye clases en vivo).
Esa página **todavía no está enlazada a la landing pública**, por instrucción explícita del usuario
("al final de las fases... procederemos a unir la landing page con las urls" — pendiente de
aprobación final).

Este prompt nuevo pide algo **distinto y ya aprobado para producción**: reestructurar la sección
`#cursos` que **ya está en vivo hoy** en `www.mea.edu.gt`, agregándole una sección hermana `#planes`
con **contenido estático** (Plan Plataforma Q150, Plan Plataforma + Grupos Q300, inscripción Q100),
cuyo CTA sigue siendo WhatsApp — no checkout, no Recurrente, no login de alumno.

**Decisión:** esta nueva sección `#planes` de la landing es **puramente de contenido/marketing**,
independiente del sistema `Plan`/`Suscripcion` del backend. No se toca el schema de Prisma, no se
toca `/api/planes`, no se toca `PricingPlanes.tsx`. Para evitar confusión de nombres en el código,
el componente/sección nueva debe identificarse claramente como la sección de landing (ej. archivo
`components/landing/PlanesLanding.tsx` o similar), no reutilizar el nombre `PricingPlanes` que ya
está tomado por el sistema de checkout.

Si en el futuro se decide unificar ambos (que los precios de la landing vengan del mismo backend
`Plan`), eso es un cambio de alcance mayor y debe tratarse como una fase aparte, no aquí.

## 1. Qué cambia

### Sección "Cursos" (`#cursos`, ya existe)
- Mantiene las 3 tarjetas de nivel (Pre A, B1 B2, VIP/Personalizado), mismo diseño (EvervaultCard,
  badges, features con check).
- **Elimina todo monto en Quetzales**: ya no se muestra el bloque "Mensualidad Q300/Q250/Q1,600".
  El campo `price` del array `courses` se elimina o se deja de renderizar.
- El CTA puede quedar como "Ver planes" (link a `#planes`) o mantenerse "Inscríbete Ahora" a
  WhatsApp — decidir en implementación, ambas son válidas según el prompt original.

### Sección "Planes" (`#planes`, nueva)
- Nueva sección en `app/page.tsx`, ubicada junto a `#cursos`, con **exactamente el mismo estilo
  visual** (mismas clases Tailwind, mismo tipo de badge "Más popular", mismo botón CTA a WhatsApp).
- Exactamente 2 tarjetas, datos hardcodeados (mismo patrón que `courses` hoy):

  1. **Plan Plataforma** — Q150/mes
     - Acceso a la plataforma educativa (material digital, clases grabadas, soporte por WhatsApp)
     - Sin clases grupales en vivo
  2. **Plan Plataforma + Grupos** — Q300/mes — marcado como "Más popular" / destacado
     - Todo lo del Plan Plataforma + clases grupales en vivo por Zoom

  (Bullets de features son propuesta razonable, igual que en el prompt original — ajustar si la
  oferta real de MEA es distinta antes de publicar.)

- Badge/nota de **Inscripción única — Q100**, dejando explícito que es pago único y **no se suma**
  a la mensualidad (reemplaza el concepto de "Q130 plataforma educativa adicional", que desaparece).
- Nuevo disclaimer al pie de esta sección:
  > "Todos los planes requieren una inscripción única de Q100 (pago único, no se repite cada mes).
  > Las mensualidades del plan elegido se pagan por separado, sin acumularse con la inscripción."
- CTA de cada tarjeta: mismo link de WhatsApp existente (`https://wa.me/50256311728?text=...`).

### Nav
- `components/ui/navbar-1.tsx`: agregar `{ label: "Planes", href: "#planes" }` a `NAV_LINKS`,
  después de "Cursos", en el array usado tanto por el menú desktop como el mobile.
- `app/page.tsx` (footer nav inline, líneas ~793-799): agregar el mismo ítem para mantener paridad.

### No tocar
- Testimonios, FAQ, hero, estadísticas, footer (excepto el ítem de nav agregado), ni ninguna otra
  sección. No tocar `/planes`, `/cursos`, `/checkout`, ni ningún endpoint backend.

## 2. Criterios de aceptación (QA)

- [ ] La sección `#cursos` ya no muestra ningún monto en Quetzales (Q250, Q300, Q1,600).
- [ ] Existe una sección `#planes` con exactamente 2 tarjetas: Plataforma (Q150/mes) y
      Plataforma + Grupos (Q300/mes, destacada con badge "Más popular").
- [ ] Las tarjetas de `#planes` usan el mismo componente/estilo visual que las de `#cursos`.
- [ ] El texto de inscripción deja claro que los Q100 son pago único y no se suman a la mensualidad.
- [ ] Cada CTA de plan enlaza a WhatsApp con el número y mensaje existentes.
- [ ] El nav (desktop, mobile y footer) permite navegar a `#cursos` y `#planes` por separado.
- [ ] Responsive: las tarjetas de `#planes` se ven bien en mobile, mismo breakpoint que `#cursos`.
- [ ] Build de producción (`next build`) pasa sin errores.
- [ ] Revisión visual en local (`npm run dev`) antes de dar por terminado.
