# brain — Log de Operaciones

> Append-only. Las entradas más recientes van al **final**.
> Formato: `## [YYYY-MM-DD HH:MM] <operación> | <slug-o-target>`
> Operaciones válidas: `bootstrap`, `ingest`, `update`, `rename`, `merge`, `split`, `lint`, `deprecate`.

---

## [2026-04-30 00:00] bootstrap | wiki-inicializado
- Creados: CLAUDE.md, index.md, log.md, sources.md, sessions/
- Áreas: marketing | ventas | cursos | operaciones | diseño
- Backend: Notion (fuente de verdad vía MCP)
- Generado por: skill claude-brain v1

## [2026-04-30 00:30] ingest | infra-despliegue-wiki-notion-mcp
- Área: operaciones
- Cross-refs: ninguna (primer nodo)

## [2026-05-06 00:00] ingest | notion-mcp-activo-query-verificado
- Área: operaciones
- Cross-refs: 2026-04-30-infra-despliegue-wiki-notion-mcp (bidireccional)

## [2026-05-08 00:00] ingest | backend-railway-desplegado
- Área: operaciones
- Cross-refs: 2026-04-30-infra-despliegue-wiki-notion-mcp (bidireccional), 2026-05-06-notion-mcp-activo-query-verificado (bidireccional)

## [2026-05-10 00:00] ingest | bot-whatsapp-claude-integrado
- Área: operaciones
- Cross-refs: 2026-05-08-backend-railway-desplegado (bidireccional), 2026-05-06-notion-mcp-activo-query-verificado (unidireccional)

## [2026-05-13 08:15] ingest | admin-rediseniado-saas-planificado
- Área: operaciones
- Cross-refs: 2026-05-10-bot-whatsapp-claude-integrado (bidireccional), 2026-05-08-backend-railway-desplegado (bidireccional)
