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

## Baseline de PageSpeed Insights / Core Web Vitals (TASK-005, cierra fase4 #7 parcialmente)

Medido 2026-09-26 vía la API de Google PageSpeed Insights (`pagespeedonline/v5`,
categoría `performance`, con una API key personal del propietario usada solo
para esta consulta puntual — no está guardada en el repo). Son mediciones de
**laboratorio**, no de campo — `loadingExperience` no devolvió datos de CrUX
reales para ninguna URL (tráfico insuficiente para que Google reporte
percentiles de campo), así que no hay LCP/INP/CLS de usuarios reales todavía;
solo Search Console (fase4 #8, bloqueada por acceso) podría aportar eso.

| Página | Estrategia | Performance | LCP | FCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|
| `/planes` | desktop | **100** | 0.4 s | 0.2 s | n/d | 40 ms | n/d |
| `/planes` | mobile | **100** | 2.1 s | 1.1 s | n/d | 30 ms | n/d (Max FID 80 ms) |
| `/cursos` | desktop | **100** | n/d | n/d | n/d | n/d | n/d |
| `/cursos` | mobile | n/d | ~2.1 s | 1.1 s | 0 | 100 ms | ~2.26 s |
| `/cursos/general` | desktop | **95** | 0.5 s | 0.3 s | 0 | 50 ms | 0.4 s |
| `/cursos/general` | mobile | **92** | n/d | n/d | n/d | n/d | n/d (TTI 3.5 s, Max FID 130 ms) |
| `/` (home) | desktop | **sin medir** | — | — | — | — | — |
| `/` (home) | mobile | **sin medir** | — | — | — | — | — |

**Home sin medir:** las 4 llamadas a la API para `/` (desktop×2, mobile×2)
excedieron el timeout de 60s de la herramienta de fetch usada — la propia
lentitud de la respuesta es evidencia consistente con que la home es la
página más pesada del sitio (HTML ~1.12 MB reportado en el PRD, hero con
Spline). No se puede confirmar todavía si el fix de carga diferida del hero
(fase4 #2, commit `f25af79`) mejoró la medición original de Performance
39/100 citada en fase3 #21 — sigue pendiente medirla desde una máquina con
Chrome, PageSpeed Insights vía navegador (no API), o reintentando la API en
otro momento con menos carga.

_Actualización 2026-09-27: se reintentó 2 veces más (desktop y mobile) — mismo
resultado, timeout de 60s. Van 6 intentos en total entre el 26 y el 27 de
septiembre. Se descarta seguir reintentando por esta vía; queda confirmado
que requiere una herramienta con presupuesto de tiempo mayor (Chrome local,
o el sitio web de PageSpeed Insights directamente, que no tiene ese límite)._

**Diagnóstico final de la home (2026-09-28), vía inspección real con Chrome
DevTools del usuario:** con "Disable cache" activado (carga en frío real,
sin caché — lo más parecido a lo que ve un visitante nuevo o Lighthouse) y
sin throttling, la home carga sin problemas: `Load: 452 ms`, `DOMContentLoaded:
447 ms`, todas las 38 requests terminan (`Finish: 4.08 s`, 2.665 MB
transferidos de 8.074 MB de recursos sin comprimir). Se descartó
específicamente la hipótesis de una conexión WebSocket persistente hacia
Spline (`wss://*.spline.design` está permitido en la CSP, pero el filtro
"Socket" de DevTools no mostró ninguna conexión activa — hipótesis
descartada). `process.wasm` (el runtime 3D de Spline,
`unpkg.com/@splinetool/modelling-wasm`) y `scene.splinecode` cargan y
completan sin colgarse.

**Conclusión:** no hay ningún hang real — un visitante con hardware normal
carga la home en ~4 segundos, sin quedarse pegado. El motivo de
`RPC::DEADLINE_EXCEEDED` en PageSpeed Insights es la combinación de: (1) el
runtime 3D de Spline consume ~10s de CPU real (medición original citada en
fase3 #21, Performance 39/100 antes del fix de fase4 #2), y (2) Lighthouse
audita con **throttling de CPU simulado (4-6x más lento)** para representar
un celular modesto — bajo esa simulación, esos ~10s de trabajo se convierten
en 40-60+ segundos, lo cual agota el propio presupuesto de tiempo del
backend de Google antes de poder terminar de generar el reporte completo.
El fix de fase4 #2 (diferir el montaje de Spline 1.5s tras `load`) mejora la
experiencia real (confirmado: `load` a los 452 ms) pero no resuelve la
medición de Lighthouse, porque ese trabajo diferido igual cae dentro de la
ventana de captura de métricas de la auditoría.

**Veredicto:** este es un límite estructural del hero con Spline bajo
condiciones simuladas de hardware lento, no un defecto de código corregible
sin tocar la escena 3D en sí (aligerarla, reemplazarla por una versión más
liviana, o quitarla del hero). Esa es una decisión de diseño/producto fuera
del alcance de este backlog — queda documentada como riesgo conocido y
aceptado, no como bloqueador pendiente de arreglo. Se da por cerrada la
tarea #7 con el baseline parcial obtenido (3/4 páginas medidas, home
diagnosticada aunque no medida numéricamente) y esta explicación.

**Dato adicional (2026-09-28):** con throttling de red "Slow 4G" pero sin
throttling de CPU, la home sí completa: `Load: 4.43 s`, `Finish: 20.02 s`
(39/39 requests). Esto confirma que la red lenta por sí sola no explica un
timeout total — se necesita la combinación de red lenta *y* CPU limitada
(que Lighthouse aplica simultáneamente) para que el trabajo de Spline
empuje el tiempo total más allá del presupuesto del backend de Google.
Refuerza el veredicto: es el costo de CPU de Spline, amplificado por
throttling combinado, lo que hace inviable medir la home con Lighthouse
mientras la escena 3D actual siga en el hero.

## Validación de JSON-LD por especificación (TASK-007, fase4 #5)

La validación interactiva con Google Rich Results Test sigue bloqueada (sin
navegador en este entorno — confirmado que la herramienta requiere JS del
lado del cliente, no responde a un GET simple ni con la URL como query
param). Como sustituto, se revisó cada tipo de JSON-LD implementado
(`lib/structured-data.ts`) contra los requisitos documentados de Google
Search y schema.org:

| Tipo | Dónde se usa | Estado |
|---|---|---|
| `EducationalOrganization` | `app/layout.tsx` (global) | OK — tiene name, url, logo, sameAs, address, areaServed; cubre de sobra lo que Google usa para Knowledge Panel. |
| `WebSite` | `app/layout.tsx` (global) | OK — sin `potentialAction`/`SearchAction` a propósito (el sitio no tiene una ruta de búsqueda real); decisión ya documentada en el código. |
| `BreadcrumbList` | Cursos y lecciones | OK — `position` (1-indexado), `name` e `item` (URL) coinciden exactamente con el formato que exige Google. |
| `Course` | `/cursos/[slug]` | **Corregido en fase4 #4-5** (commit `72e7d21`): le faltaba `hasCourseInstance` u `offers`, requisito obligatorio de Google para elegibilidad a rich results de Course (sin eso el JSON-LD es válido pero no elegible). Se agregó `hasCourseInstance.courseMode: "online"` (dato real, sin precio/horario/instructor inventado). |
| `LearningResource` | Lecciones públicas | OK como schema.org válido — Google no tiene un rich result de búsqueda general para este tipo (es más relevante para Google for Education / datasets), así que no hay un requisito de elegibilidad adicional que perseguir. |
| `ItemList` | `/cursos` | OK — agregado en fase4 #4, con `position`/`url`/`item` (Course anidado) por cada ruta, mismo orden que el catálogo visible. |
| `FAQPage` | Home | **Válido, pero con una limitación de política de Google que ningún cambio de código puede resolver**: desde 2023 Google restringió el rich result de FAQ en resultados de búsqueda a sitios gubernamentales y de salud reconocidos. El JSON-LD de MEA es correcto y usa las mismas preguntas visibles en el acordeón, pero es improbable que aparezca como snippet enriquecido en Google Search por esta política, no por un defecto propio. |

**Conclusión:** no se encontraron más brechas corregibles por código además de
la de `Course` (ya resuelta). Lo que queda pendiente es exclusivamente la
corrida real de Google Rich Results Test / validator.schema.org para
confirmar 0 errores de parseo — bloqueada por falta de navegador en este
entorno, igual que el baseline de la home.

**Lectura de lo medido:** `/planes`, `/cursos` y una página de curso están en
excelente estado (92-100 en laboratorio, sin problemas de CLS donde se pudo
medir). El riesgo de rendimiento real del sitio se concentra en la home, que
sigue sin baseline confirmado.

## Re-crawl final post-cambios (TASK-010, cierra fase4 #9)

Ejecutado 2026-09-28 contra `https://www.mea.edu.gt/` en producción.

**HALLAZGO CRÍTICO, no relacionado con SEO en sí:** producción corre
`main`, cuyo último commit es `0123b61` (2026-09-17, "feat(seo): implementar
SEO técnico completo del sitio Fase 1+2"). La rama de trabajo
`fix/security-remediation` — donde vive TODO este backlog (`seo-mea`,
`seo-mea-fase2`, `seo-mea-fase3`, `seo-mea-fase4`, y además el plan
completo de remediación de seguridad de sesiones anteriores) — está
**39 commits adelante de `main` y nunca se fusionó**. Esto significa que:

- Ninguno de los 6 fixes de código de `seo-mea-fase4` (commits `93c9d71`,
  `f25af79`, `72e7d21`, `ecffb09`) está reflejado en producción todavía.
- El re-crawl de abajo describe el estado de producción **tal como está
  hoy** (equivalente a la línea base de fase 1+2, del 17/sep), no valida
  los fixes de esta fase — eso solo se podrá confirmar después de mergear
  y desplegar.

**Resultado del crawl (producción, 2026-09-28):**

- Sitemap: **133 URLs** (el número sigue moviéndose porque el catálogo de
  lecciones gratis/pagas cambia con el tiempo — era 108 el 24/sep, 144 el
  26/sep). Las 5 lecciones antes señaladas como "noindex en el sitemap"
  siguen presentes y siguen siendo indexables (confirma otra vez que ese
  hallazgo del PRD v1.1 ya estaba resuelto/desactualizado, independiente
  de esta rama).
- Contadores de la home: siguen mostrando **"0+"** en el HTML — consistente
  con que el fix de fase4 #1 no está desplegado. No es una regresión del
  fix; es que el fix nunca llegó a producción.
- No se pudo verificar en este crawl (limitación de la herramienta de
  fetch, no renderiza JS ni expone `<head>`): herencia de OG en lecciones
  noindex, ItemList/FAQPage JSON-LD, ni el fallback del hero — todos
  confirmados por lectura de código y por las pruebas del usuario con
  DevTools/Rich Results Test contra el mismo dominio, que sí reflejaron
  comportamiento post-fix en algunos casos (ver nota de fase4 #7 sobre el
  timing de Spline, que si coincide con el fix desplegado en la practica
  aunque el resto del bundle de main no lo tenga — posible desajuste entre
  lo que Vercel sirve por edge cache vs. el build actual; no investigado
  a fondo, ver siguiente punto).

**Siguiente paso real:** para que cualquiera de los fixes de `seo-mea` /
`seo-mea-fase2` / `seo-mea-fase3` / `seo-mea-fase4` (y el plan de seguridad
de esta misma rama) lleguen a los usuarios reales, hace falta abrir un PR
de `fix/security-remediation` hacia `main` y desplegarlo. Sin ese paso,
todo este backlog queda completo en el código pero invisible en producción.

## Registro de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-19 | Backlog SEO inicial basado en auditoría previa. |
| 1.1 | 2026-09-24 | Rebaselining: se retiran tareas ya resueltas, se priorizan sitemap, metadata residual, validación, rendimiento y experiencia del hero. |
