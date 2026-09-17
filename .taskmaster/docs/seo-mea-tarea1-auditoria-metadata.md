# Tarea 1 — Auditoría de metadata actual e inconsistencias (SEO MEA)

Stack confirmado: **Next.js 16.2.4, App Router**. Fecha de auditoría: 2026-09-14.

## 1. Metadata server-side existente

| Ruta | Archivo | Metadata propia | Notas |
|---|---|---|---|
| `/` | `app/layout.tsx:15-20` | Sí (única fuente, `app/page.tsx` es `"use client"` y no puede exportar `metadata`) | Incluye `keywords` (a eliminar). Sin canonical, sin OG/Twitter. |
| `/cursos` | `app/cursos/page.tsx:8-12` | Sí, título/descr. únicos | Sin canonical/OG/Twitter |
| `/planes` | `app/planes/page.tsx:7-11` | Sí, título/descr. únicos | Sin canonical/OG/Twitter. Descripción con claim no verificado (ver §5 TODO 2) |
| `/clases-en-vivo` | `app/clases-en-vivo/page.tsx:8-11` | Sí, título/descr. únicos | Sin canonical/OG/Twitter |
| `/cursos/[slug]` | `app/cursos/[slug]/page.tsx:13-20` (`generateMetadata`) | Sí, dinámica por ruta desde `getRutaCurriculum()` | Sin canonical/OG/Twitter/breadcrumb JSON-LD |
| `/cursos/[slug]/leccion/[leccionSlug]` | `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx` | **No existe `generateMetadata`** | Hereda título/descripción genéricos del layout raíz — confirma el hallazgo de la auditoría pública |

No se encontró `metadataBase` en ningún layout — falta para que URLs absolutas de OG/canonical se generen correctamente.

## 2. Por qué las lecciones no traen H1 ni contenido en el HTML inicial

- `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx` es un Server Component "vacío" que solo renderiza `<LeccionClient rutaSlug leccionSlug />`.
- `components/cursos-online/LeccionClient.tsx` es `"use client"` y carga los datos en `useEffect` (`cargar()` → `getAlumnoToken() ? alumnoApi.getRuta(...) : getRutaCurriculum(...)`). El H1/título/contenido de la lección se pintan recién tras hidratación — coincide exactamente con el hallazgo de la auditoría pública.
- **Dato clave para la Tarea 5:** `getRutaCurriculum(slug)` (la misma función server-safe que ya usa `generateMetadata` en `/cursos/[slug]`) es el fallback cuando no hay token de alumno, o sea que el curriculum de una ruta (incluyendo lecciones marcadas `esGratis: true`) **ya es accesible sin autenticación**. Esto significa que sí se puede generar metadata y contenido server-side para lecciones gratis sin duplicar lógica nueva.
- El modelo de datos (`lib/rutas.ts:19-27`, interfaz `LeccionCurriculum`) ya tiene el campo `esGratis: boolean` que distingue lecciones públicas de las que requieren suscripción.

## 3. Intención SEO ya declarada en el código (evidencia fuerte, no asunción)

`app/sitemap.ts:6-7` trae este comentario del propio equipo:

> "Sitemap dinámico: home + secciones + rutas + lecciones GRATIS (las públicas, indexables sin login — **ventaja SEO frente a competidores que exigen cuenta**)."

El sitemap ya incluye las URLs de lecciones `esGratis: true` con esa intención explícita de indexarlas. Esto es evidencia directa (no inventada) de que la dirección correcta para la Tarea 5 es la **Opción A: hacer indexables las lecciones gratis**, ya que es la intención documentada por el propio repositorio. Se deja como decisión formal a confirmar en la Tarea 5, pero el TODO de "cuál opción elegir" queda prácticamente resuelto por esta evidencia.

## 4. robots.txt / sitemap.xml

- `app/robots.ts`: bloquea `/admin`, `/mis-cursos`, `/checkout`, `/verify`, `/verify-online`. Coincide con la auditoría pública.
- `app/sitemap.ts`: 4 URLs estáticas + rutas de curso + lecciones gratis, consistente con las ~108 URLs / ~97 lecciones reportadas en la auditoría.
- No hay `lastmod` en ninguna entrada — no hay fecha real de actualización disponible en las fuentes de datos consultadas (`getRutas`, `getRutaCurriculum`); no se debe inventar.

## 5. TODOs de verificación — NO resolver sin confirmación del propietario

### TODO 1 — Discrepancia "2,000" vs "200" estudiantes (CRÍTICO, bloquea Tarea 2)
- `app/layout.tsx:18` (meta description): **"Más de 2,000 estudiantes"**
- `app/page.tsx:112` (stats grid, `AnimatedCounter`): **valor `200`**
- `app/page.tsx:423`: "Más de **200** profesionales"
- `app/page.tsx:471`: "+**200** estudiantes satisfechos"
- `app/page.tsx:581`: "Más de **200** profesionales y estudiantes"
- `app/page.tsx:844`: "más de **200** profesionales latinoamericanos"

→ **5 apariciones visibles dicen "200"**, solo la meta description del layout dice "2,000". Señal fuerte de que "2,000" es un error tipográfico, pero **no se cambia sin confirmación explícita del propietario** — la regla del brief prohíbe asumir cuál cifra es correcta. Acción para Tarea 2: dejar el TODO explícito en el código o preguntar al dueño antes de escribir la meta description final.

### TODO 2 — Claim no verificado en `/planes` (bloquea Tarea 3)
- `app/planes/page.tsx:11`: la meta description dice **"Ahorrá hasta 30% con planes de 3, 6 o 12 meses"**.
- `content/site.json` → `planes`: solo 3 planes (`Plataforma` Q130/año, `Plataforma + Grupos` Q300 sin período explícito, `VIP` sin precio). **No hay ningún dato de planes de 3/6/12 meses ni de un descuento del 30% en ningún lugar del código o del contenido.**
- Acción: no reutilizar esta frase en la nueva meta description de `/planes` hasta que el propietario confirme si esos planes de 3/6/12 meses existen fuera de `site.json` o si es contenido obsoleto que debe eliminarse.

### TODO 3 — OG image
- No existe ninguna imagen 1200×630 identificada como OG oficial en `public/`. Pendiente de que el propietario provea el asset o se confirme cuál imagen existente usar.

### TODO 4 — `metadataBase`
- Falta declarar `metadataBase: new URL("https://www.mea.edu.gt")` en `app/layout.tsx` — necesario para que canonical/OG generen URLs absolutas correctamente (Tarea 6).

### TODO 5 — Redirección dominio raíz sin `www`
- No hay `vercel.json` ni configuración de redirects en el repo para consolidar `mea.edu.gt` → `www.mea.edu.gt`. Esto se gestiona típicamente en la configuración de dominios del proyecto en Vercel (fuera del código). Queda pendiente verificar en el dashboard de Vercel, no en este repo.

## 6. Datos confirmados como reales (no inventar de nuevo, ya están en el footer de `app/page.tsx`)

- Dirección física: "2da calle 7-00 zona 11 de Mixco, alta villa el Naranjo D42" (línea 938)
- Teléfono/WhatsApp: +502 5631-1728 (línea 940)
- Email: mea.learnandplay@gmail.com (línea 945)
- Redes: Instagram, Facebook, YouTube (líneas 897-899) con URLs reales
- Horario: "Lunes a Sábado · 8am – 5pm" (línea 949)

Estos datos son utilizables tal cual para el `Organization` JSON-LD (Tarea 8) y `sameAs` — no requieren inventar nada.

## 7. Segundo H1 confirmado (para Tarea 10)

- `app/page.tsx:561-565` pasa `heading="El método que sí funciona"` al componente `Feature108`.
- `components/ui/shadcnblocks-com-feature108.tsx:88` renderiza ese prop dentro de un `<h1>` literal — este es el segundo H1 real de la homepage, exactamente el mencionado en el brief. Debe cambiarse a `<h2>` en ese componente (afecta a cualquier otro uso de `Feature108`, verificar antes de tocarlo).

## 8. Páginas sin metadata única que sí deben tenerla (confirmado)

Todas las 7 rutas de `/cursos/[slug]` ya generan metadata dinámica (§1), así que están cubiertas estructuralmente — falta enriquecerlas con canonical/OG/JSON-LD (Tareas 3-4, 6, 8-9), no crearlas desde cero.
