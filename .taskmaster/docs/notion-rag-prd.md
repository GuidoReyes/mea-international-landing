# PRD: Notion RAG Completo para Bot WhatsApp MEA

## Contexto

El bot de WhatsApp de MEA International usa Claude (Anthropic) para responder consultas de leads potenciales. 
Actualmente, `backend/src/lib/notion-context.ts` solo consulta UNA página hardcodeada de Notion 
(la de precios, ID: `35d83de9-b32b-8001-bec4-edb3e3e4665c`). Además, la búsqueda adicional en Notion 
nunca se ejecuta porque la condición `sections.length === 0` siempre es `false` después de cargar 
la página de precios.

El resultado es que el bot solo puede responder preguntas de precios con contexto real de Notion. 
Preguntas sobre horarios, instructores, modalidades, requisitos, metodología, certificaciones y 
disponibilidad de cupos quedan sin datos específicos de MEA.

## Objetivo

Implementar un sistema RAG (Retrieval-Augmented Generation) completo que conecte el bot de WhatsApp 
con toda la base de conocimiento de Notion de MEA International, permitiendo respuestas precisas y 
actualizadas sobre cualquier aspecto del negocio.

## Requerimientos funcionales

### Task 69 — Notion RAG completo para bot WhatsApp

Implementar un sistema de recuperación de contexto multi-página desde Notion para el bot de WhatsApp,
con enrutamiento por intención, caché Redis por categoría, y fallback a búsqueda semántica.

#### Subtareas requeridas:

**69.1 — Auditar y mapear páginas de Notion**
Identificar y registrar en el código todos los IDs de páginas clave de Notion de MEA:
precios, cursos, horarios, instructores, metodología, requisitos de inscripción, certificaciones, 
FAQ, política de pagos. Crear constante `NOTION_PAGES` con mapa `{ clave: pageId }`.
Verificar que el NOTION_TOKEN tiene acceso de lectura a todas esas páginas.

**69.2 — Corregir bug de búsqueda adicional en notion-context.ts**
El bloque de búsqueda adicional (`searchTerms`) nunca se ejecuta porque la condición 
`if (searchTerms && sections.length === 0)` es siempre false después de cargar la página de precios.
Separar la lógica: primero ejecutar el enrutamiento por keywords, luego ejecutar la búsqueda 
adicional de Notion de forma independiente si hay términos relevantes, y finalmente combinar 
ambos resultados hasta el límite de tokens.

**69.3 — Enrutamiento multi-página por intención del mensaje**
Reemplazar el único keyword array de precios por un mapa de intenciones:
- `precios/costos` → página de precios
- `horarios/clases/días/horas` → página de horarios  
- `cursos/niveles/A1/B1/C1/básico/intermedio/avanzado` → página de cursos
- `inscripción/requisitos/documentos/empezar` → página de requisitos
- `instructor/profesor/maestro` → página de instructores
- `certificado/certificación/diploma` → página de certificaciones
- `metodología/cómo funciona/plataforma` → página de metodología
- `pago/cuota/mensual/forma de pago` → página de política de pagos
Cada intención puede devolver 1-2 páginas. Combinar hasta 2,000 chars de contexto total.

**69.4 — Consultar base de datos de Notion para disponibilidad en tiempo real**
Implementar `queryNotionDatabase(databaseId, filter)` que consulte la base de datos de cursos 
activos en Notion para obtener: nombre del curso, precio actual, cupos disponibles, próxima fecha 
de inicio, modalidad. Cachear en Redis con TTL de 30 minutos (los precios cambian poco). 
Usar este resultado cuando el lead pregunta por disponibilidad o "cuándo empieza".

**69.5 — Aumentar límite de contexto y mejorar formato**
El contexto actual se trunca a 1,500 caracteres — insuficiente para describir múltiples cursos.
Aumentar a 3,000 caracteres. Estructurar el contexto inyectado en el system prompt con secciones 
claras: `## Precios`, `## Horarios`, `## Cursos disponibles`, etc., en lugar de texto plano, 
para que Claude pueda citarlos con más precisión.

**69.6 — Logging y monitoreo de uso de contexto Notion**
Agregar logs estructurados que registren: qué páginas se consultaron, si fue cache hit/miss, 
cuántos chars de contexto se enviaron a Claude, y si el lead recibió respuesta con contexto 
de Notion o sin él. Usar el logger existente `log("info", ...)` con prefijo `[NotionRAG]`.

## Criterio de éxito

Un lead que pregunte "¿cuándo empiezan las clases de inglés intermedio?" recibe una respuesta 
con la fecha real de la próxima edición tomada de Notion, no una respuesta genérica.
Un lead que pregunte "¿qué documentos necesito para inscribirme?" recibe los requisitos exactos 
de MEA tomados de Notion.
