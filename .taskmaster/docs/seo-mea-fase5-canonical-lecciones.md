# Decisión: canonical de lecciones compartidas entre rutas (fase5 R7)

Auditado 2026-09-28 vía la API pública (`getRutaCurriculum` por ruta).

## Hallazgo

Varias rutas vocacionales reutilizan el **mismo registro de lección**
(mismo `leccion.id` en la API, no una copia con otro id) para temas de
gramática comunes. Confirmado con al menos:

| `leccion.id` | Slug | Rutas donde aparece |
|---|---|---|
| 125 | `presente-continuo` | `general`, `tecnicos-pc` |
| 126 | `presente-continuo-para-futuro` | `general`, `tecnicos-pc` |
| 155 | `presente-perfecto` | `general`, `oficina`, `tecnicos-pc` |

Al ser el mismo `id`, es estructuralmente el mismo contenido — no hace
falta comparar el texto de los pasos lección por lección, la igualdad está
garantizada por la base de datos.

(Nota: `presente-perfecto` también existe como lección **distinta**, id
133, título "Presente perfecto (+/-/?)", `esGratis: false` — es contenido
distinto, no está en este análisis porque ya es `noindex` por la regla
existente de `esGratis`.)

## Decisión

Se aplicó la regla por defecto del PRD v1.2 ("si el contenido es idéntico
→ canonical apunta a `/cursos/general/leccion/<slug>`"), implementada de
forma genérica y no hardcodeada por lección específica:

- `app/cursos/[slug]/leccion/[leccionSlug]/page.tsx`: nueva función
  `slugCanonico(rutaSlug, leccion)` — si la ruta actual no es `general`,
  busca por `leccion.id` (no por slug) dentro del curriculum de `general`;
  si la encuentra, el `canonical` de la página apunta a la versión de
  `general` en vez de la ruta actual.
- `app/sitemap.ts`: deduplica por `leccion.id` antes de listar lecciones,
  con la misma preferencia por `general` — evita que el sitemap incluya
  3 URLs distintas para lo que Google debe tratar como una sola página.

Esta lógica es genérica: cubre automáticamente cualquier lección futura
que se comparta entre rutas, no solo las 3 confirmadas arriba.

## Limitación conocida

La regla solo consolida hacia `general`. Si en el futuro dos rutas
*no-general* comparten una lección que no está en `general`, no se
detecta con esta implementación — no se encontró ningún caso así en la
auditoría del 2026-09-28, pero si aparece habría que ampliar
`slugCanonico` para buscar en más de una ruta candidata.
