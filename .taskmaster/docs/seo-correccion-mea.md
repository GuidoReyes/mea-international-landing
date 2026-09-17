# Brief para Claude Code: corrección SEO de MEA International

## Objetivo

Implementa las correcciones SEO necesarias en el sitio de MEA International (www.mea.edu.gt) para mejorar rastreo, indexación, relevancia orgánica, compartición social, rendimiento y conversión.

El resultado debe conservar la funcionalidad y la identidad visual actuales. No hagas un rediseño general ni cambies textos comerciales sin verificar primero la fuente de verdad en el repositorio.

## Contexto del análisis

Auditoría pública realizada el 14 de septiembre de 2026.

El sitio público utiliza Next.js y Vercel. Estas observaciones fueron verificadas desde el HTML entregado por el servidor:

- https://www.mea.edu.gt/ responde con HTML renderizado en servidor.
- robots.txt existe, es texto plano válido y referencia sitemap.xml.
- sitemap.xml existe y contiene 108 URLs.
- Las 108 URLs verificadas del sitemap respondieron con 200 OK.
- El sitemap contiene aproximadamente 97 URLs de lecciones.
- Las páginas principales tienen títulos únicos, pero no tienen etiquetas canonical.
- No se detectaron og:*, Twitter Cards ni bloques JSON-LD en las páginas revisadas.
- La home tiene dos elementos H1.
- La home entrega aproximadamente 1.1 MB de HTML y precarga muchas imágenes externas.
- Varias imágenes no tienen dimensiones explícitas.
- Las lecciones entregan en el HTML inicial el título y la descripción genéricos de la home.
- Las lecciones no entregan un H1 ni el contenido de la lección en el HTML inicial; el contenido aparece después de ejecutar JavaScript.
- La meta descripción de la home afirma "Más de 2,000 estudiantes", mientras que el contenido visible utiliza "Más de 200". No asumir cuál cifra es correcta: verificarla en el código o pedir confirmación al propietario.

## Regla principal: no inventar información

No inventes:

- Número de estudiantes.
- Calificaciones.
- Testimonios.
- Certificaciones.
- Profesores o credenciales.
- Ubicaciones físicas.
- Alianzas.
- Precios.
- Resultados laborales.
- Fechas de cursos.

Si existe una inconsistencia, utiliza la fuente de verdad existente en el repositorio o deja un TODO explícito para confirmación. No soluciones una inconsistencia cambiando silenciosamente una cifra.

## Alcance de implementación

### 1. Inspección inicial

Antes de modificar archivos:

- Identifica la versión de Next.js y si se utiliza App Router o Pages Router.
- Localiza:
  - Layout raíz.
  - Configuración de metadata.
  - Rutas de cursos.
  - Rutas de lecciones.
  - Generación de sitemap.
  - Generación de robots.
  - Componentes de navegación y footer.
  - Sistema actual de imágenes.
  - Fuente de verdad de cursos, niveles y lecciones.
- Revisa si las lecciones son:
  - Contenido público destinado a posicionar, o
  - Contenido de plataforma que requiere autenticación o no debe indexarse.
- No dupliques lógica si ya existe una función centralizada para metadata o datos de cursos.

### 2. Metadata por página

Implementa metadata server-side específica y estable para todas las páginas indexables.

**Página de inicio** — usar como dirección editorial, ajustando el texto a la información verificada:
- Title recomendado: `Clases de Inglés Online en Guatemala | MEA International`
- Meta description sugerida: `Aprende inglés online en Guatemala con clases personalizadas, cursos por nivel y rutas para trabajo, viajes y call center. Conoce MEA International.`
- No uses la meta description sugerida si alguna de sus afirmaciones no coincide con el producto real.

**/cursos**
- Title recomendado: `Cursos de Inglés Online por Niveles y Especialidades | MEA`
- Meta description sugerida: `Cursos de inglés online por niveles y especialidades: inglés general, oficina, viajes, restaurantes, computación y call center. Primeras lecciones gratis.`

**/planes**
- Title recomendado: `Precios de Cursos de Inglés Online | MEA International`
- Mantener únicamente beneficios y descuentos que estén confirmados en el código o contenido oficial.

**/clases-en-vivo**
- Title recomendado: `Clases de Inglés en Vivo por Zoom | MEA International`
- Incluir modalidad, público, niveles y horarios solamente si están realmente disponibles.

**Páginas de curso** — crear metadata única para:
- /cursos/general
- /cursos/viajar
- /cursos/restaurantes
- /cursos/talleres
- /cursos/oficina
- /cursos/tecnicos-pc
- /cursos/call-center

El title debe incluir el curso y, cuando sea natural, "MEA International". La descripción debe explicar el objetivo del curso, su público y su nivel.

**Páginas de lección**

Si una lección debe ser indexable:
- Generar title único usando el nombre real de la lección.
- Generar meta description única.
- Generar H1 único.
- Añadir canonical a la URL limpia.
- Añadir breadcrumbs.
- Renderizar en el HTML inicial el título, resumen y contenido educativo indexable.

Si las lecciones no deben ser indexables porque son parte privada o su contenido depende de una sesión:
- Añadir `noindex, follow`.
- Retirarlas del sitemap.
- Mantener los enlaces internos funcionales para usuarios.
- Documentar en el resumen final por qué se eligió esta opción.

### 3. Canonicalización

Todas las páginas indexables deben tener un canonical absoluto:

`<link rel="canonical" href="https://www.mea.edu.gt/ruta">`

Requisitos:
- El canonical debe apuntar a la URL canónica https://www.mea.edu.gt.
- No debe incluir parámetros de tracking.
- Debe seguir una única convención de slash final.
- Las variantes con parámetros, como /planes?nivel=A1, deben:
  - Tener canonical hacia /planes si son solo filtros, o
  - Convertirse en rutas permanentes si tienen contenido único real.

Revisa también la redirección del dominio raíz sin www. Debe existir una consolidación permanente hacia el host canónico, sin cadenas innecesarias.

### 4. Sitemap y robots

Mantén robots.txt con las rutas privadas bloqueadas.

El sitemap debe contener solamente URLs que cumplan todas estas condiciones:
- Responden 200.
- Son canónicas.
- Son públicas.
- No tienen noindex.
- Tienen contenido suficiente.

No incluyas en el sitemap rutas de login, checkout, administración, verificación, contenido privado o filtros duplicados.

Si existe una fecha real de actualización en la fuente de datos, añade lastmod. No inventes fechas. No es necesario mantener changefreq o priority si el generador no los necesita.

### 5. Datos estructurados JSON-LD

Añade datos estructurados válidos y escapados correctamente.

**Sitewide**
- Organization
- WebSite

Usa datos reales de MEA. No añadas dirección, redes sociales, teléfono o email si no están presentes en la fuente oficial.

**Con breadcrumbs visibles**
- BreadcrumbList

**Páginas de cursos**
- Course o ItemList, según la estructura real.

**Páginas de lecciones públicas**
- LearningResource, Article o Course, eligiendo el tipo que mejor represente el contenido real.

**FAQ**
- Usa FAQPage únicamente si las preguntas y respuestas están visibles en el HTML y cumplen las políticas actuales de Google. No marques preguntas ocultas solamente para obtener rich results.

No añadas Review o AggregateRating con testimonios no verificables.

### 6. Open Graph y Twitter Cards

Añade metadata social específica por página:
- og:title
- og:description
- og:url
- og:type
- og:locale con es_GT
- og:site_name
- og:image
- twitter:card
- twitter:title
- twitter:description
- twitter:image

La imagen OG debe ser una imagen real, pública y alojada en el sitio, idealmente de 1200 × 630 px. No uses base64 como og:image y no apuntes a un archivo que no exista.

Si no existe una imagen oficial adecuada, no inventes una identidad visual nueva sin revisar los assets existentes. Puedes dejar la infraestructura lista y documentar el asset pendiente.

### 7. Encabezados y contenido semántico

Requisitos:
- Un solo H1 por página indexable.
- No saltar niveles sin motivo.
- Convertir el segundo H1 de la home, "El método que sí funciona", en H2.
- Asegurar que los headings de cursos y lecciones sean texto legible, con espacios correctos.
- No usar headings solamente para aplicar estilos.

En cada página comercial de curso, incluir una introducción visible que explique, si la información existe:
- Para quién es.
- Qué aprenderá.
- Nivel recomendado.
- Modalidad.
- Duración.
- Certificación.
- Siguiente paso.

No agregues números o promesas no verificadas.

### 8. Imágenes y rendimiento

Optimiza sin degradar la experiencia visual:
- Usa imágenes locales y optimizadas cuando sea posible.
- Prefiere WebP o AVIF.
- Define width y height para evitar CLS.
- Usa lazy loading debajo del primer viewport.
- Precarga únicamente la imagen crítica del hero.
- Evita precargar todas las fotos de testimonios.
- Reduce la repetición de testimonios y assets en la home.
- Revisa imágenes externas de randomuser.me y Unsplash; reemplázalas solo con assets oficiales o reales, no con perfiles inventados.
- Conserva alt descriptivo y honesto.
- Revisa el tamaño de JavaScript y el HTML generado de la home.

No reemplaces imágenes con placeholders silenciosos.

### 9. Enlaces internos y breadcrumbs

Mejora la arquitectura interna:
- Home → cursos → curso especializado → lección.
- Curso → planes.
- Curso → clases en vivo cuando sea relevante.
- Lección → curso padre y lección siguiente/anterior.
- Usa anchors descriptivos.
- Añade breadcrumbs visibles y datos estructurados equivalentes en páginas profundas.

No crees enlaces hacia rutas inexistentes.

### 10. Confianza y conversión

Revisa que existan enlaces visibles y funcionales hacia:
- Contacto.
- WhatsApp.
- Email.
- Portal de alumnos.
- Política de privacidad.
- Términos y condiciones.
- Información de cancelación o reembolso, si aplica.

No inventes una dirección física. Si MEA opera solamente online, expresa correctamente el área de servicio.

Mantén las llamadas a WhatsApp y agrega medición de eventos únicamente si ya existe una infraestructura de analítica o si el repositorio tiene una forma segura y documentada de configurarla. No introduzcas claves privadas en el código.

### Nuevas páginas de aterrizaje

Antes de crear páginas nuevas, revisa si ya existen rutas equivalentes. Si no existen y la arquitectura actual lo permite, prioriza estas páginas:

- /clases-de-ingles-online-guatemala
- /clases-de-ingles-personalizadas
- /ingles-para-call-center-guatemala
- /ingles-para-trabajo
- /ingles-para-adultos

Cada página debe tener contenido sustancial y diferente. No crees páginas casi idénticas cambiando solamente la ciudad o la palabra clave.

Si no hay suficiente información oficial para construirlas sin inventar contenido, no las crees todavía. Documenta qué información falta.

## Requisitos técnicos de calidad

- Respeta la arquitectura actual del proyecto.
- Usa las APIs nativas de metadata del framework existente.
- No cambies de framework.
- No introduzcas una librería SEO pesada si la funcionalidad se puede implementar con el framework actual.
- No elimines rutas funcionales.
- No elimines contenido sin justificarlo.
- No cambies precios, testimonios o claims sin evidencia.
- No uses meta keywords.
- No dupliques metadata global en páginas dinámicas.
- Escapa correctamente JSON-LD.
- Mantén TypeScript estricto si el proyecto lo usa.
- Mantén linting y formato existentes.

## Validación obligatoria

Después de implementar, ejecuta los comandos equivalentes disponibles en el repositorio para:
- Typecheck.
- Lint.
- Build de producción.
- Tests existentes.

Además, valida con el servidor de producción o preview:

**Home y páginas principales** — comprobar que el HTML inicial contiene:
- Un title correcto.
- Una meta description correcta.
- Canonical.
- H1.
- JSON-LD válido.
- Open Graph.
- Twitter Card.

**Lecciones** — para una lección representativa, comprobar que el HTML entregado sin ejecutar JavaScript contiene:
- Title único.
- Meta description única.
- Canonical.
- H1 real de la lección.
- Resumen o contenido indexable, si la lección es pública.

**Robots y sitemap** — comprobar:

```
curl -i https://www.mea.edu.gt/robots.txt
curl -i https://www.mea.edu.gt/sitemap.xml
```

Verificar que:
- robots.txt es texto plano.
- sitemap.xml es XML real.
- Todas las URLs del sitemap son canónicas.
- No hay URLs privadas ni noindex.
- Las URLs del sitemap responden 200.

**Validadores externos recomendados** (si están disponibles):
- Google Rich Results Test.
- Google Search Console.
- PageSpeed Insights.
- Lighthouse móvil y escritorio.
- Validador XML.

## Criterios de aceptación

El trabajo se considera terminado cuando:
- Todas las páginas indexables tienen metadata única.
- Todas las páginas indexables tienen canonical.
- La home tiene exactamente un H1.
- Las páginas de lecciones tienen contenido indexable server-side o están explícitamente fuera del índice y del sitemap.
- No se mantiene la metadata genérica de la home en las lecciones.
- El sitemap contiene únicamente URLs públicas, canónicas e indexables.
- Se incorporan JSON-LD válidos sin claims inventados.
- Se incorporan Open Graph y Twitter Cards.
- Se eliminan las meta keywords.
- Las imágenes críticas tienen dimensiones y carga razonable.
- El build, typecheck, lint y tests existentes pasan.
- No se rompe la navegación, el checkout, WhatsApp, el portal de alumnos ni la experiencia móvil.

## Entrega final esperada

Al terminar, entrega:
- Resumen de cambios.
- Lista de archivos modificados.
- Decisión aplicada a las páginas de lecciones y su justificación.
- Claims o datos que quedaron pendientes de confirmación.
- Resultado de typecheck, lint, build y tests.
- Resultado de las comprobaciones de HTML, robots y sitemap.
- Recomendaciones que no se pudieron implementar sin información del propietario.
