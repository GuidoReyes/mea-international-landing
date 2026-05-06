# brain — Registro de fuentes externas

> IDs cortos para referenciar desde frontmatter (`sources:`) y cuerpos de nodos.
> Notion es **source of truth**. Cuando un nodo cite una fuente de aquí, Claude DEBE
> consultar Notion vía `mcp__notion__notion-fetch` antes de afirmar su contenido.
> El campo "Resumen cache" sólo sirve para decidir si vale la pena hacer fetch — NO es autoritativo.

---

## Notion

<!-- Agregar una entrada por cada página de Notion relevante al proyecto -->
<!-- Formato: ID corto en kebab-case, título, URL completa, resumen corto -->

### ejemplo-pagina
- **Título:** Nombre de la página
- **URL:** https://www.notion.so/<id-de-la-pagina>
- **Resumen cache:** Descripción breve del contenido (para decidir si hacer fetch).
- **Regla:** Resolver contenido real vía MCP antes de cualquier afirmación.
- **Última verificación:** YYYY-MM-DD

<!-- Duplicar el bloque anterior para cada fuente Notion -->

---

## Repo (archivos del proyecto que son referenciados como fuentes)

<!-- Archivos importantes que NO son nodos del wiki pero se citan en sesiones -->

### ejemplo-doc
- **Path:** `ruta/relativa/al/archivo.md`
- **Descripción:** Qué contiene este archivo.
