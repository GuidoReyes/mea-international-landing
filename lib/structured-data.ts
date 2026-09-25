// Utilidades compartidas para generar bloques JSON-LD (schema.org) escapados
// de forma segura. Usado por páginas de cursos, lecciones y el layout raíz.

// Imagen social compartida (1200x630), generada a partir del logo real y los
// colores de marca (#0A2540 / #00C4B4) — public/og-image.png.
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "MEA International — Clases de Inglés Online en Guatemala",
};

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Datos verificados en el footer de app/page.tsx (líneas 886-949) — no inventar
// ni agregar campos (dirección, teléfono, redes) que no estén confirmados ahí.
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    // EducationalOrganization (subtipo real de Organization) en vez del
    // genérico Organization — MEA es una academia con dirección física
    // verificada, así que este tipo es más preciso para SEO local
    // (seo-mea-fase2, tarea 7). No se agregan coordenadas geográficas ni
    // otros campos no confirmados.
    "@type": "EducationalOrganization",
    name: "MEA International",
    url: "https://www.mea.edu.gt",
    logo: "https://www.mea.edu.gt/mea%20logo.svg",
    telephone: "+502 5631-1728",
    email: "mea.learnandplay@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "2da calle 7-00 zona 11 de Mixco, alta villa el Naranjo D42",
      addressCountry: "GT",
    },
    areaServed: "GT",
    sameAs: [
      "https://www.instagram.com/m.e.a_academy/",
      "https://www.facebook.com/MEAINTERNATIONAL.GT?locale=es_LA",
      "https://www.youtube.com/@meacademy2871",
    ],
  };
}

// Sin potentialAction/SearchAction: el sitio no tiene una ruta de búsqueda
// real (verificado — no existe app/buscar ni similar). No inventar la función.
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MEA International",
    url: "https://www.mea.edu.gt",
  };
}

// Solo usar con preguntas que ya son visibles en el HTML de la página (ej. un
// acordeón cuyo contenido está en el DOM aunque esté colapsado) — nunca con
// texto oculto solo para obtener rich results.
export function faqPageJsonLd(items: { title: string; content: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.content,
      },
    })),
  };
}

export interface ItemListEntry {
  name: string;
  description: string;
  url: string;
}

// Lista de las rutas/cursos reales mostradas en /cursos, en el mismo orden en
// que aparecen en el catálogo (components/cursos-online/CatalogoRutas.tsx).
export function itemListJsonLd(items: ItemListEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      item: {
        "@type": "Course",
        name: item.name,
        description: item.description,
        url: item.url,
      },
    })),
  };
}

export interface CourseJsonLdInput {
  name: string;
  description: string;
  url: string;
}

export function courseJsonLd({ name, description, url }: CourseJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: "MEA International",
      sameAs: "https://www.mea.edu.gt",
    },
    // Google exige hasCourseInstance u offers para que el Course sea elegible
    // a rich results (si no, el JSON-LD es válido pero no elegible). Todos
    // los cursos de MEA son 100% online (verificado en el modelo de negocio,
    // sin sedes presenciales) — no se inventa horario, instructor ni precio
    // por curso, ya que eso vive a nivel de plan/suscripción en /planes.
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
    },
  };
}

export interface LearningResourceJsonLdInput {
  name: string;
  description: string;
  url: string;
  educationalLevel: string;
  cursoNombre: string;
  cursoUrl: string;
}

// Solo para lecciones públicas (esGratis=true). No inventar autor, fecha de
// publicación ni rating — el modelo real de datos no los tiene.
export function learningResourceJsonLd({
  name,
  description,
  url,
  educationalLevel,
  cursoNombre,
  cursoUrl,
}: LearningResourceJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url,
    educationalLevel,
    learningResourceType: "Lesson",
    isPartOf: {
      "@type": "Course",
      name: cursoNombre,
      url: cursoUrl,
    },
    provider: {
      "@type": "Organization",
      name: "MEA International",
      sameAs: "https://www.mea.edu.gt",
    },
  };
}

// Serializa un objeto JSON-LD para <script type="application/ld+json">,
// escapando "<" para evitar que un valor con "</script>" rompa el documento.
export function jsonLdScriptProps(data: Record<string, unknown>): {
  type: string;
  dangerouslySetInnerHTML: { __html: string };
} {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}
