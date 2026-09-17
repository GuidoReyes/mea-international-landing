# PRD: SEO MEA International — Fase 2 (Autoridad, Contenido, Local, Medición)

## Contexto

Este es un PRD de continuación. En la Fase 1 (tag Task Master `seo-mea`, completada y desplegada a producción el 2026-09-16) ya se resolvió, verificado en vivo en www.mea.edu.gt:

- Metadata única (title/description) en home, /cursos, /planes, /clases-en-vivo, páginas de curso y **lecciones gratuitas** (antes heredaban el title/description de la home — corregido).
- `<link rel="canonical">` absoluto en todas las páginas indexables.
- JSON-LD: `Organization`, `WebSite`, `BreadcrumbList` (cursos y lecciones), `FAQPage` (con las 6 preguntas reales ya visibles en la home), `Course` (páginas de curso).
- Open Graph y Twitter Cards completos, con imagen real 1200×630 (`public/og-image.png`, generada del logo y colores de marca reales) en todas las páginas.
- Lecciones gratuitas (`esGratis: true`) ahora renderizan server-side: H1 único, breadcrumb visible, y un resumen indexable con contenido real (vocabulario/preguntas) extraído del contenido interactivo de la lección. Lecciones bloqueadas usan `noindex, follow`.
- Un solo H1 en la home (`components/ui/shadcnblocks-com-feature108.tsx`, antes tenía un segundo `<h1>`).
- Cifra de estudiantes unificada en "200" en todo el sitio (antes la home decía "2,000" en la meta description y "200" en el contenido visible).
- Reducción de precarga de imágenes en la home (`loading="lazy"` en avatares/testimonios no críticos) — antes se precargaban ~7 imágenes externas innecesariamente.
- `robots.txt` y `sitemap.xml` ya estaban correctos (rutas privadas bloqueadas, sitemap solo con URLs públicas/canónicas incluyendo lecciones gratis) — verificado, sin cambios necesarios.

**No reabrir estos puntos.** Este documento cubre exclusivamente lo que sigue pendiente según el análisis SEO de septiembre de 2026, después de la Fase 1.

## Objetivo

Cerrar las brechas de contenido, autoridad/confianza, SEO local y medición que quedaron fuera de la Fase 1, sin inventar información no verificada (cifras, testimonios, certificaciones, direcciones, alianzas, fechas).

## Regla principal (heredada de la Fase 1, sigue aplicando)

No inventar información. Si un dato no está confirmado en el repositorio o por el propietario, dejar un TODO explícito o preguntar antes de publicar. No resolver una inconsistencia inventando una cifra.

## Alcance

### 1. Redirección de dominio sin `www` (crítico, fuera del repo)

`mea.edu.gt` (sin www) debe redirigir de forma permanente y directa a `https://www.mea.edu.gt`. Esto se configura en el dashboard de Vercel (Domains del proyecto), no en el código del repositorio. Acción: verificar la configuración actual y documentar el resultado; si falta, configurarla o pedir acceso para hacerlo.

### 2. Contenido ampliado en páginas de curso (alto impacto SEO)

Para las 7 rutas de curso (`/cursos/general`, `/viajar`, `/restaurantes`, `/talleres`, `/oficina`, `/tecnicos-pc`, `/call-center`):

- Agregar una introducción visible (300-600 palabras) que explique, **solo con información real o confirmable**: para quién es el curso, qué aprenderá el estudiante, nivel recomendado, modalidad, duración, certificación, siguiente paso.
- Antes de escribir cada intro, revisar qué datos ya existen en `getRutaCurriculum()` / `getRutas()` y en el contenido real de las lecciones de esa ruta. No inventar duración total ni certificación si no están confirmadas — dejar TODO explícito y preguntar al propietario.
- No duplicar contenido casi idéntico entre las 7 páginas cambiando solo el nombre del curso.

### 3. JSON-LD adicional en lecciones públicas

Las lecciones gratuitas actualmente solo tienen `BreadcrumbList`. Agregar `LearningResource` (o `Course`, evaluando cuál representa mejor el contenido real) usando los datos ya disponibles server-side (título de la lección, curso padre, nivel) — mismo patrón usado para `courseJsonLd` en `lib/structured-data.ts`.

### 4. Event JSON-LD en /clases-en-vivo — decisión ya tomada: NO implementar por ahora

Verificado: `HorarioSlot` (`lib/clases-en-vivo.ts`) solo expone `diaSemana` + `horaInicio` (horario semanal recurrente), sin fechas concretas (`startDate`). El schema `Event` de schema.org espera instancias de evento con fecha específica; forzarlo sobre un horario recurrente sin fecha no es correcto y puede generar advertencias de Google Search Console. No implementar Event JSON-LD a menos que el backend empiece a exponer fechas concretas por sesión.

### 5. Páginas de aterrizaje para búsquedas comerciales prioritarias

Evaluar con el propietario, antes de crear cualquier página nueva, si existe información real y sustancialmente distinta (no una copia de `/cursos/*` cambiando palabras clave) para:

- `/clases-de-ingles-online-guatemala`
- `/ingles-para-call-center-guatemala`
- `/ingles-para-trabajo`
- `/clases-de-ingles-personalizadas`
- `/ingles-para-adultos`

Si no hay contenido suficiente y verificado para una página, no crearla todavía — documentar qué información falta.

### 6. Autoridad y confianza

- Sección o página de perfiles de docentes (nombre, certificación real, experiencia) — requiere que el propietario provea los datos; no inventar biografías ni certificaciones.
- Revisar que la política de privacidad, términos y condiciones, y política de cancelación/reembolso (ya existen vía `LegalModal` en `app/page.tsx`) estén vigentes y completas — revisión de contenido, no reconstrucción del componente.
- Cualquier contenido nuevo debe usar la cifra de estudiantes ya unificada (200), sin reintroducir "2,000" ni otras cifras no confirmadas.

### 7. SEO local

- Evaluar una sección o página específica para Guatemala / Ciudad de Guatemala — solo si el servicio realmente atiende esas ubicaciones (ya confirmado: MEA tiene dirección física real en Mixco, Guatemala — ver `app/page.tsx` footer).
- Evaluar (acción del propietario, fuera del repo) registrar/optimizar un perfil de Google Business Profile.
- No inventar sedes, ciudades de cobertura o presencia física no confirmada.

### 8. Sitemap: `lastmod`

No implementable hoy: ni `RutaCurriculum` ni `LeccionCurriculum` (`lib/rutas.ts`) exponen una fecha real de actualización, y el endpoint del backend (`backend/src/routes/rutas.ts`) tampoco la devuelve actualmente. Para habilitar `lastmod` de forma honesta:

1. Backend: agregar/confirmar un campo real `updatedAt` en los modelos `Ruta`/`Leccion` (Prisma) y exponerlo en la respuesta de `/api/rutas` y `/api/rutas/:slug/curriculum`.
2. Frontend: usar ese valor real en `app/sitemap.ts` para `lastmod`.

No agregar `lastmod` con una fecha inventada o con la fecha de build como sustituto.

### 9. Medición (GA4 / Search Console / eventos de conversión)

- Antes de asumir que falta analítica, confirmar si ya existe alguna integración de Vercel Analytics, GA4 o Search Console conectada al proyecto (revisar variables de entorno / integraciones del proyecto en Vercel).
- Si no existe, evaluar con el propietario qué instalar (Vercel Analytics vía Marketplace, o GA4) antes de agregar cualquier script de terceros — no introducir tracking sin consentimiento explícito del propietario, dado que afecta CSP (`next.config.ts`) y requiere actualizar `connect-src`/`script-src`.
- Una vez decidida la plataforma de analítica, instrumentar eventos de conversión reales: clic en WhatsApp, clic en llamada, registro de alumno, inicio de checkout.

## Fuera de alcance de este PRD (ya resuelto en Fase 1 — no reabrir)

Metadata única, canonical, JSON-LD base (Organization/WebSite/BreadcrumbList/Course/FAQPage), Open Graph/Twitter con imagen real, indexación server-side de lecciones gratuitas, H1 único en home, unificación de la cifra de estudiantes, reducción de precarga de imágenes, corrección de robots.txt/sitemap.xml (ya estaban correctos).

## Requisitos técnicos de calidad

- Respetar la arquitectura actual (Next.js App Router, TypeScript estricto).
- No introducir librerías SEO pesadas si se puede resolver con las APIs nativas del framework.
- No agregar scripts de terceros (analítica, tracking) sin actualizar `next.config.ts` (CSP) de forma consistente y sin exponer claves privadas en el código.
- Validar con `tsc --noEmit`, `npm run build` y una revisión del HTML renderizado (como se hizo en la Fase 1) antes de dar cualquier tarea por terminada.

## Criterios de aceptación

- Ninguna de las 7 páginas de curso repite contenido casi idéntico entre sí; cada intro usa solo datos reales o confirmados.
- Las lecciones gratuitas tienen JSON-LD adicional (`LearningResource` o `Course`) sin duplicar el `BreadcrumbList` existente.
- Se documenta explícitamente la decisión de no usar `Event` JSON-LD y por qué.
- No se crea ninguna página de aterrizaje nueva sin contenido real y sustancialmente distinto.
- `lastmod` en el sitemap solo se agrega si hay una fuente de fecha real de principio a fin (backend + frontend).
- Cualquier script de analítica/tracking agregado está reflejado en la CSP de `next.config.ts` y fue confirmado con el propietario.
- Build, typecheck y lint (para los archivos tocados) pasan limpios.

## Entrega esperada por tarea

Resumen de cambios, archivos modificados, datos que quedaron pendientes de confirmación del propietario, y resultado de typecheck/build.
