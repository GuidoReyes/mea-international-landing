---
type: session
area: operaciones
date: 2026-05-06
slug: notion-mcp-activo-query-verificado
title: "Notion MCP activo y primer query de marketing verificado"
tags: [notion-mcp, brain, query, verificacion, url, marketing]
status: active
related:
  - 2026-04-30-infra-despliegue-wiki-notion-mcp
sources:
  - notion:estrategia-marketing
  - repo:brain/sources.md
superseded_by: null
---

# Notion MCP activo y primer query de marketing verificado

## Contexto

Sesión de verificación y cierre de la integración Notion MCP iniciada en [[2026-04-30-infra-despliegue-wiki-notion-mcp]]. El usuario completó los pendientes de esa sesión y se detectó un error en la URL de Notion en `brain/sources.md` que fue corregido. Primer `/brain query` exitoso sobre estrategia de marketing.

## Decisiones

- **URL de Notion debe copiarse completa desde el navegador**: al ingresar solo los números del ID se perdió un carácter (31 en lugar de 32). La URL correcta incluye el slug del título: `https://www.notion.so/MEA-international-35883de9b32b80fba23de9193f46a917`. Regla: nunca transcribir el ID manualmente.
- **`/brain lint` es útil solo cuando hay 2+ nodos en áreas relacionadas**: con un único nodo no detecta cross-refs faltantes. Ejecutar después de crear el primer nodo de marketing.

## Output

- `brain/sources.md` — URL de Notion corregida a `https://www.notion.so/MEA-international-35883de9b32b80fba23de9193f46a917`
- Notion MCP verificado: fetch exitoso a la página "Estrategia de Marketing — MEA International"
- Primer `/brain query` ejecutado y respondido con contenido fresco de Notion
- Resumen completo del proyecto generado (stack, arquitectura, 11 secciones, infraestructura)

## Pendiente

- [ ] Ejecutar `/brain lint` después de crear el primer nodo en área `marketing`
- [ ] Instalar Google Analytics 4 en mea.edu.gt (pendiente de Notion)
- [ ] Optimizar WhatsApp Business (pendiente de Notion)
- [ ] Publicar primer Reel de mini-clase en Instagram (pendiente de Notion)

## Cross-refs

- [[2026-04-30-infra-despliegue-wiki-notion-mcp]] — sesión anterior donde se configuró el MCP; esta sesión cierra sus pendientes
- [[2026-05-08-backend-railway-desplegado]] — sesión posterior que usa Notion MCP como fuente para Task 9 (RAG de contexto)

## Fuentes

- [[sources#estrategia-marketing]] (Notion) — página verificada con MCP fetch
- `repo:brain/sources.md` — URL corregida en esta sesión
