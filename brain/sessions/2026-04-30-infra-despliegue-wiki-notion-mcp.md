---
type: session
area: operaciones
date: 2026-04-30
slug: infra-despliegue-wiki-notion-mcp
title: "Infraestructura de despliegue, wiki claude-brain e integración Notion MCP"
tags: [vercel, porkbun, dns, github, netlify, claude-brain, notion-mcp, despliegue, wiki]
status: active
related: []
sources:
  - repo:brain/CLAUDE.md
  - repo:.mcp.json
  - repo:.claude/commands/brain.md
  - repo:.gitignore
superseded_by: null
---

# Infraestructura de despliegue, wiki claude-brain e integración Notion MCP

## Contexto

Sesión de configuración completa de infraestructura para el proyecto MEA International landing page (Next.js 16 + TypeScript + Tailwind). La landing page ya estaba construida desde sesiones anteriores. En esta sesión se configuró todo lo relacionado a despliegue, repositorio, herramientas de conocimiento y MCP.

## Decisiones

- **Vercel sobre Netlify**: se eligió Vercel como plataforma de despliegue por soporte nativo de Next.js (zero-config), auto-deploy en push a `main` y SSL gratuito automático.
- **DNS en Porkbun directamente**: los registros DNS se agregan en el panel de Porkbun, no en otro proveedor. Registro A `@` → `76.76.21.21` y CNAME `www` → `cname.vercel-dns.com`. Eliminar registros de parking previos antes de agregar los de Vercel.
- **NotebookLM descartado como backend automático**: no tiene API pública. Se eligió Notion (opción A) como fuente de verdad del wiki porque tiene MCP con fetch automático.
- **claude-brain instalado globalmente** (`~/.claude/skills/claude-brain`) para que esté disponible en todos los proyectos, no solo en este.
- **`.mcp.json` ignorado en `.gitignore`**: protección del token de Notion. El archivo existe localmente pero nunca se sube al repositorio.

## Output

- Repositorio GitHub creado: `mea-international-landing` en rama `main`
- Vercel conectado al repositorio con auto-deploy activo
- Dominio propio en Porkbun apuntando a Vercel (pendiente propagación DNS al momento de la sesión)
- `brain/` — wiki claude-brain inicializado con áreas: marketing, ventas, cursos, operaciones, diseño
- `.claude/commands/brain.md` — slash command `/brain` instalado
- `.vscode/settings.json` — configuración Foam para grafo visual de wikilinks
- `.mcp.json` — configuración Notion MCP creada (token pendiente)
- `.gitignore` actualizado: agrega `.claude/` y `.mcp.json`

## Pendiente

- [ ] Crear integración en [notion.so/my-integrations](https://www.notion.so/my-integrations) con nombre "MEA Brain Claude"
- [ ] Pegar token `ntn_...` en `.mcp.json` (campo `Authorization: Bearer`)
- [ ] Compartir páginas de Notion con la integración MEA Brain Claude
- [ ] Completar `brain/sources.md` con URLs reales de páginas de Notion
- [ ] Recargar Claude Code para activar el MCP (`/mcp` para verificar)
- [ ] Instalar extensión Foam en VSCode para ver el grafo visual

## Cross-refs

- [[2026-05-06-notion-mcp-activo-query-verificado]] — sesión que cerró los pendientes de MCP y verificó el primer query
- [[2026-05-08-backend-railway-desplegado]] — sesión que agrega Railway como plataforma backend complementaria a Vercel

## Fuentes

- `repo:brain/CLAUDE.md` — manual operativo del wiki
- `repo:.mcp.json` — config Notion MCP (token pendiente)
- `repo:.claude/commands/brain.md` — slash command /brain
- [Notion My Integrations](https://www.notion.so/my-integrations)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Porkbun DNS](https://porkbun.com)
