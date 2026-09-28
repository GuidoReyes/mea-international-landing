# PRD para Task Master: Optimización SEO integral de MEA International

## 1. Información del producto

Producto: Sitio web de MEA International
Dominio: https://www.mea.edu.gt/
Tipo: Academia de inglés online y cursos especializados
Idioma principal: Español (es-GT)
Objetivo del proyecto: Corregir todos los problemas SEO técnicos y de contenido detectados, aumentar la visibilidad orgánica y dejar el sitio preparado para alcanzar puntuaciones SEO técnicas máximas en las herramientas de validación.

Importante: ningún sistema puede garantizar una puntuación literal de 100 en Google ni posiciones concretas. El objetivo de este PRD es lograr 100% de cumplimiento de los requisitos SEO definidos, eliminar los bloqueadores críticos y alcanzar al menos 90/100 en auditorías automatizadas cuando los datos reales y el rendimiento lo permitan.

## 2. Contexto y hallazgos de la auditoría

Auditoría pública de referencia realizada en septiembre de 2026.

### Hallazgos verificados

- El sitio utiliza HTTPS y responde desde Vercel/Next.js.
- robots.txt existe, es texto plano válido y referencia el sitemap.
- sitemap.xml existe y contiene aproximadamente 108 URLs.
- Aproximadamente 97 URLs corresponden a lecciones.
- Las URLs verificadas del sitemap responden con 200 OK.
- Las páginas principales son renderizadas server-side.
- Las páginas de lecciones entregan metadata genérica de la home en el HTML inicial.
- Las páginas de lecciones no entregan correctamente su H1 ni el contenido educativo en el HTML inicial.
- No se detectaron etiquetas canonical en las páginas revisadas.
- No se detectaron etiquetas Open Graph ni Twitter Cards.
- No se detectaron bloques JSON-LD.
- La página de inicio tiene dos H1.
- La home tiene aproximadamente 1.1 MB de HTML.
- La home utiliza múltiples imágenes externas y varias imágenes sin dimensiones explícitas.
- La meta description menciona "más de 2,000 estudiantes", mientras que el contenido visible menciona "más de 200".
- Las páginas de cursos especializados tienen potencial SEO, pero necesitan mayor contexto, intención de búsqueda y enlaces internos.

> Nota de reconciliación (agregada al importar este PRD a Task Master el 2026-09-18): esta auditoría es la misma línea base de septiembre de 2026 que ya se abordó en las fases anteriores (tags `seo-mea` y `seo-mea-fase2`). La mayoría de estos hallazgos ya están corregidos y verificados en vivo en producción. Ver la sección de reconciliación al final de este documento.

### Rutas principales conocidas

```
/
/cursos
/planes
/clases-en-vivo
/cursos/general
/cursos/viajar
/cursos/restaurantes
/cursos/talleres
/cursos/oficina
/cursos/tecnicos-pc
/cursos/call-center
/cursos/*/leccion/*
```

## 3. Objetivos del producto

### Objetivos primarios

- Eliminar todos los bloqueadores críticos de rastreo e indexación.
- Asegurar que cada página indexable tenga contenido HTML útil sin depender exclusivamente de JavaScript.
- Crear metadata única y relevante para cada página.
- Implementar canonicalización consistente.
- Implementar datos estructurados válidos.
- Mejorar el rendimiento de la home y de las páginas públicas.
- Mejorar la arquitectura interna y la relevancia de las páginas comerciales.
- Preparar medición de tráfico y conversiones orgánicas.
- Validar el resultado con build, tests, crawling, HTML y herramientas SEO.

### Objetivos de negocio

Incrementar tráfico orgánico cualificado para: clases de inglés online en Guatemala, academia de inglés online, clases personalizadas de inglés, inglés para call center, inglés para trabajo, inglés para adultos, inglés para oficina, inglés para viajar, inglés especializado para restaurantes, talleres y técnicos.

### Objetivos de calidad SEO

- 0 páginas indexables con title duplicado.
- 0 páginas indexables con meta description duplicada.
- 0 páginas indexables sin canonical.
- 0 páginas indexables sin H1.
- 0 páginas públicas indexables cuyo contenido principal dependa exclusivamente de JavaScript.
- 0 URLs privadas o noindex dentro del sitemap.
- 0 errores 4xx/5xx en URLs indexables del sitemap.
- 1 solo H1 por página indexable.
- JSON-LD válido en las páginas donde corresponda.
- Open Graph y Twitter Cards en páginas públicas.
- Mejorar Core Web Vitals sin degradar funcionalidad.

## 4. Usuarios y casos de uso

Persona en Guatemala o Latinoamérica que busca aprender inglés online, mejorar sus oportunidades laborales, trabajar en un call center, viajar o aprender inglés aplicado a su profesión.

- El usuario busca "clases de inglés online Guatemala" y encuentra una landing page relevante.
- El usuario busca "inglés para call center Guatemala" y encuentra información completa del curso.
- Google rastrea una página de curso y recibe HTML semántico, metadata, canonical y schema.
- El usuario comparte una página por WhatsApp y recibe una vista previa con imagen, título y descripción correctos.
- El propietario consulta Search Console y puede identificar qué páginas generan tráfico y conversiones.

## 5. Reglas de seguridad y contenido (obligatorias en todas las tareas)

- No inventar cifras de estudiantes, testimonios, certificaciones, profesores, alianzas, sedes o direcciones, precios, descuentos o garantías laborales.
- No publicar información médica, legal o financiera.
- No añadir una dirección física si el negocio no tiene una ubicación pública verificable.
- Si existen datos contradictorios, identificar la fuente de verdad o dejar una incidencia para confirmación.
- No comprar enlaces ni implementar esquemas de enlaces artificiales.
- No ocultar texto SEO al usuario. No usar keyword stuffing.
- No crear cientos de páginas casi idénticas.
- No cambiar el branding ni rediseñar todo el sitio como parte de este proyecto.
- No romper login, checkout, WhatsApp, portal de alumnos ni navegación móvil.

## 6. Requisitos funcionales

(RF-001 a RF-012: metadata única por ruta, canonicalización, decisión de indexación de lecciones, sitemap limpio, robots, datos estructurados, etiquetas sociales, jerarquía de encabezados, contenido comercial, enlaces internos, rendimiento, analítica — ver historial de la conversación para el detalle completo; cada uno se refleja en las tareas de la sección 7).

## 7. Backlog priorizado para Task Master

### Épica E1: Auditoría del código y baseline

**TASK-001 — Mapear arquitectura SEO existente** (P0, sin dependencias)
Identificar framework, routing, layout, metadata, generadores de sitemap/robots, fuente de datos de cursos y renderizado de lecciones. Criterios: inventario de rutas públicas/privadas; se identifica App Router; se identifica dónde se genera metadata, sitemap y robots; se identifica la fuente de verdad de cursos/lecciones; decisiones documentadas antes de modificar código.

**TASK-002 — Crear baseline automatizado de SEO** (P0, depende de TASK-001)
Crear o documentar una validación repetible para inspeccionar HTML, titles, descriptions, H1, canonical, JSON-LD, sitemap, robots y status codes. Criterios: ejecutable localmente; lista páginas con errores; distingue públicas/privadas/noindex; genera resumen legible.

### Épica E2: Metadata y canonical

**TASK-003 — Metadata base del sitio** (P0, depende de TASK-001)
**TASK-004 — Metadata única en páginas principales** (P0, depende de TASK-003) — `/`, `/cursos`, `/planes`, `/clases-en-vivo`
**TASK-005 — Metadata para cursos especializados** (P0, depende de TASK-003) — todas las rutas indexables bajo `/cursos/*`
**TASK-006 — Canonical por página** (P0, depende de TASK-003)
**TASK-007 — Resolver redirección de host canónico** (P1, depende de TASK-006)

### Épica E3: Indexación de lecciones

**TASK-008 — Decidir política de indexación de lecciones** (P0, depende de TASK-001)
**TASK-009 — Renderizar lecciones públicas para SEO** (P0, depende de TASK-008)
**TASK-010 — Marcar lecciones privadas como noindex** (P0, depende de TASK-008)
**TASK-011 — Navegación profunda y breadcrumbs** (P1, depende de TASK-009)

### Épica E4: Sitemap, robots y schemas

**TASK-012 — Limpiar generador de sitemap** (P0, depende de TASK-008, TASK-006)
**TASK-013 — Validar y ajustar robots.txt** (P1, depende de TASK-012)
**TASK-014 — Organization y WebSite JSON-LD** (P0, depende de TASK-001)
**TASK-015 — Course, ItemList y LearningResource JSON-LD** (P1, depende de TASK-009, TASK-014)

### Épica E5: Social metadata y contenido on-page

**TASK-016 — Open Graph y Twitter Cards** (P1, depende de TASK-004, TASK-005)
**TASK-017 — Corregir jerarquía H1-H3** (P0, depende de TASK-004)
**TASK-018 — Mejorar contenido de páginas de cursos** (P1, depende de TASK-005)
**TASK-019 — Corregir inconsistencias de claims** (P0, depende de TASK-001)

### Épica E6: Rendimiento e imágenes

**TASK-020 — Optimizar imágenes de la home** (P1, depende de TASK-001)
**TASK-021 — Reducir HTML y datos repetidos de la home** (P1, depende de TASK-020)
**TASK-022 — Revisar Core Web Vitals** (P1, depende de TASK-020, TASK-021)

### Épica E7: Arquitectura comercial y SEO local

**TASK-023 — Mapa de keywords y URLs** (P1, depende de TASK-001)
**TASK-024 — Crear landings comerciales faltantes** (P1, depende de TASK-023)
**TASK-025 — Revisar señales de SEO local** (P1, depende de TASK-001)

### Épica E8: Analítica y validación final

**TASK-026 — Revisar medición de conversiones orgánicas** (P1, depende de TASK-001)
**TASK-027 — Validación técnica completa** (P0, depende de TASK-002, TASK-007, TASK-012, TASK-017, TASK-019, TASK-022)
**TASK-028 — Reporte SEO post-implementación** (P1, depende de TASK-027)

## 8-12. Dependencias, requisitos no funcionales, Definition of Done, comandos de validación, resultado esperado

(Ver historial de la conversación del 2026-09-18 para el detalle completo de cada sección — grafo de dependencias, NFRs de rendimiento/accesibilidad/seguridad/mantenibilidad, DoD, y comandos sugeridos de `curl`/Lighthouse.)

## Nota de reconciliación con el trabajo ya realizado (Fases 1 y 2)

Antes de ejecutar cualquier tarea de este backlog, revisar el estado real del sitio — gran parte de esta auditoría ya fue corregida y verificada en vivo en `www.mea.edu.gt` durante las fases anteriores (tags Task Master `seo-mea` y `seo-mea-fase2`, sept. 2026):

- Metadata única, canonical, redirect 308, OG/Twitter Cards, Organization/WebSite/Course/LearningResource/BreadcrumbList/FAQPage JSON-LD, indexación server-side de lecciones gratuitas (noindex para las bloqueadas), H1 único en home, unificación de cifras (200 estudiantes), introducciones de 300-600 palabras en las 7 páginas de curso, optimización de imágenes (dimensiones + lazy loading), imagen OG real, Vercel Web Analytics con eventos de conversión, EducationalOrganization con dirección real.

No reabrir ni duplicar ese trabajo. Este documento se usa para: (a) marcar como completadas las tareas de este backlog que ya están resueltas, con referencia a la fase/tarea previa que las cubrió, y (b) ejecutar únicamente el trabajo genuinamente nuevo o incompleto (ver reconciliación tarea por tarea en Task Master).
