# PRD para Task Master: prioridades SEO pendientes de MEA International

Version: 1.1
Last updated: 2026-09-24
Status: Draft
Driver: Responsable SEO/producto de MEA (por asignar)
Approver: Responsable del negocio MEA (por asignar)
Contributors: Desarrollo web y revisión SEO

> Nota de reconciliación (agregada al importar a Task Master el 2026-09-25): este PRD v1.1 reemplaza el backlog inicial v1.0. El v1.0 ya estaba importado en Task Master bajo los tags `seo-mea`, `seo-mea-fase2` y `seo-mea-fase3` (ver `.taskmaster/docs/seo-mea-fase3-integral.md`), con la mayoría de sus 51 tareas ya `done`. Se verificó cada uno de los 10 TASK de este PRD contra el código real y la producción en vivo (2026-09-25) antes de crear trabajo nuevo, para no duplicar resultados:
>
> - **TASK-001** (excluir noindex del sitemap): no reproducible hoy — el sitemap en vivo (144 URLs, subió de ~108) ya incluye las 5 lecciones citadas como `esGratis=true`/indexables; el código hace estructuralmente imposible que una lección noindex esté en el sitemap. Hallazgo del 24/sep desactualizado por cambio de catálogo. Corresponde a fase3 #10/#12, ya `done` — sin cambios.
> - **TASK-002** (canonical de `?nivel=`): ya resuelto en código (`app/planes/page.tsx` usa canonical estático). Se agregó solo tarea de documentación (fase4 #6).
> - **TASK-003** (metadata social): `og-image.png` ya es 1200×630 (correcto). Se confirmó un bug real: las lecciones noindex heredan el Open Graph de la home por merge de metadata de Next.js (fase4 #3).
> - **TASK-004** (spinner del hero + contadores en 0): confirmado y abierto. `AnimatedCounter` en `app/page.tsx` arranca en 0 (fase4 #1). Hay un fix WIP sin commitear para el hero Spline (fase4 #2).
> - **TASK-005/006** (baseline y optimización de rendimiento): sin baseline formal guardado; hay una medición suelta (Lighthouse Performance 39/100, TBT 5.9s, atribuida a Spline). Ver fase4 #7, y fase3 #21/#22 actualizadas con esta evidencia.
> - **TASK-007** (validar JSON-LD): implementación ya existe (commit `0123b61`), pero se encontró que `FAQPage` está definido y sin usar, e `ItemList` falta por completo. Fase3 #15 se cerró como `done` por lo implementado; ver fase4 #4 y #5 para completar y validar con herramientas externas.
> - **TASK-008** (contenido comercial): mayormente cubierto por fase2 #2 y fase3 #18, ya `done`. Fase3 #24 (landings nuevas) permanece `deferred`, consistente con el no-objetivo de este PRD de no generar páginas nuevas en masa.
> - **TASK-009** (Search Console): sin acceso confirmado — ver fase4 #8, bloqueada documentando la limitación, sin simular resultados.
> - **TASK-010** (validación post-cambios): corresponde a fase3 #27/#28 y fase4 #9.
>
> El trabajo genuinamente nuevo quedó importado en el tag Task Master `seo-mea-fase4` (9 tareas). No se creó un backlog TASK-001…010 paralelo para evitar duplicar las ~51 tareas ya existentes en `seo-mea` + `seo-mea-fase2` + `seo-mea-fase3`.

---

Esta revisión reemplaza el backlog inicial de auditoría. Se basa en el estado público observado el 24 de septiembre de 2026. No volver a crear tareas para mejoras que ya están implementadas, salvo que una validación de código las contradiga.

## 1. Resumen

MEA International ya cuenta con una base técnica SEO considerablemente mejor que la observada en la auditoría inicial. El objetivo de este backlog es cerrar los problemas residuales confirmados, medir los aspectos que aún no se han medido y evitar cambios amplios que no estén respaldados por evidencia.

## 2. Problema

El rastreo actual confirma que los fundamentos on-page y técnicos principales ya están en su lugar, pero quedan desajustes concretos de indexación y metadata. Además, todavía no hay mediciones de Core Web Vitals, no se ha validado el significado del JSON-LD con herramientas de resultados enriquecidos y una captura de la home mostró una zona del hero aparentemente cargando.

## 3. Baseline verificado (auditoría pública 24 de septiembre de 2026)

- Se rastrearon 108 URLs del sitemap; todas respondieron 200 OK.
- Las 108 tienen title y canonical; no se encontraron titles ni canonicals duplicados.
- Las 108 tienen exactamente un H1.
- Se encontraron descripciones en las 108 URLs. Cuatro lecciones comparten una descripción genérica sobre suscripción.
- Cinco páginas con noindex seguían incluidas en el sitemap (ver nota de reconciliación arriba: ya no reproducible el 25/sep).
- Open Graph y Twitter Cards presentes; `og-image.png` responde 200 (1200×630, confirmado correcto el 25/sep).
- JSON-LD sintácticamente válido, sin validar aún elegibilidad para resultados enriquecidos.
- Home ~1.12 MB de HTML, TTFB ~0.13s.
- Meta description de home ~175 caracteres, /cursos 199, /planes 174.
- Captura de escritorio mostró zona sin contenido + indicador de carga junto al hero (confirmado: hero Spline, ver fase4 #2).
- Contadores animados con valores iniciales en 0 (confirmado: `AnimatedCounter`, ver fase4 #1).
- No se midieron LCP, INP ni CLS. No hay acceso confirmado a Search Console, Analytics ni backlinks.

## 4. No objetivos

- No rehacer metadata de las 108 URLs.
- No reconstruir el sitio ni cambiar de framework.
- No rediseñar la marca o la home completa.
- No generar en masa nuevas páginas SEO ni páginas casi duplicadas.
- No inventar cifras, testimonios, certificaciones, precios o credenciales.
- No prometer posición en buscadores ni puntuación literal de 100.
- No declarar un problema de Core Web Vitals sin medición.
- No comprar enlaces ni crear enlaces artificiales.

## Decisión: canonicalización del parámetro `?nivel=` (TASK-002, cierra fase4 #6)

Verificado 2026-09-25: `?nivel=` en `/planes` (`app/planes/page.tsx`) es el **único**
parámetro de query usado en todo el sitio (confirmado con `grep -rn "searchParams"`
sobre todas las rutas de `app/`) — no hay otros parámetros de filtro, nivel o
tracking (UTM u otros) en ninguna otra página.

**Naturaleza del parámetro:** `nivel` es un filtro de personalización de UI. Al
llegar con `?nivel=C1`, `/planes` muestra una línea de texto adicional
("Empezando desde nivel C1 — cualquier plan te da acceso a tu nivel") y
propaga el valor al enlace de checkout (`/checkout/[id]?nivel=C1`). No cambia
el listado de planes, precios ni el contenido principal de la página — es la
misma oferta comercial con un mensaje contextual distinto, no una página con
intención de búsqueda propia.

**Decisión:** no crear variantes indexables por nivel. `/planes` ya declara
`alternates.canonical: "/planes"` de forma estática (sin leer `searchParams`),
por lo que **cualquier valor de `?nivel=`** — válido o inválido — canonicaliza
a la URL base. Esto ya estaba implementado correctamente en el código antes de
esta revisión; no se requirió ningún cambio. `/checkout/[id]?nivel=...` no es
indexable (no está en el sitemap y depende de sesión/checkout), así que no
necesita canonical propio.

**No objetivo cumplido:** no se crearon landings ni contenido nuevo por nivel,
consistente con el no-objetivo del PRD v1.1 de no generar páginas casi
duplicadas.

## Registro de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-19 | Backlog SEO inicial basado en auditoría previa. |
| 1.1 | 2026-09-24 | Rebaselining: se retiran tareas ya resueltas, se priorizan sitemap, metadata residual, validación, rendimiento y experiencia del hero. |
