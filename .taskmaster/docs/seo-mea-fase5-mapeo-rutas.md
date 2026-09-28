# Auditoría de mapeo lección→ruta: /cursos/talleres (fase5 R6)

Auditado 2026-09-28 vía `GET https://api.mea.edu.gt/api/rutas/talleres/curriculum`.

## Hallazgo principal

La ruta "Inglés para Talleres Mecánicos" **ya tiene un currículo automotriz
extenso y específico** (77 lecciones en 30+ capítulos), incluyendo:

- Herramientas y partes del vehículo (`herramientas-taller`, `partes-motor`,
  `frenos-suspension`, `sistema-electrico`)
- Atención al cliente en el taller (`recibir-cliente`, `explicar-reparacion`,
  `entrega-vehiculo`)
- Diagnóstico avanzado (`el-escaner-de-diagnostico-obd`,
  `vocabulario-de-sintomas-del-vehiculo`, capítulo completo "Engine Trouble")
- Presupuestos y facturación (`explicar-un-presupuesto-detallado`,
  `vocabulario-de-facturacion`, `negociar-el-costo-de-reparacion`)
- Garantía y seguimiento (`vocabulario-de-garantia`,
  `seguimiento-post-servicio`)

**Conclusión sobre las 3 lecciones "nuevas" que pedía el PRD v1.2:**
`vocabulario-del-motor`, `herramientas-del-taller` y `hablar-con-el-cliente`
ya están cubiertas, con mejor granularidad, por lecciones existentes
(`partes-motor`, `herramientas-taller`, `explicar-reparacion` +
`recibir-cliente`). **No se recomienda crear lecciones nuevas** — sería
contenido casi duplicado. Si el dueño quiere revisar/ampliar alguna de las
existentes, es preferible editarlas antes que crear nuevas con otro slug.

## Lecciones fuera de nicho (confirmado por el dueño, 2026-09-28)

| Capítulo | Slug | Título |
|---|---|---|
| 53 — Cooking With Friends | `vocabulario-de-cocina` | Vocabulario de cocina |
| 53 — Cooking With Friends | `imperativo` | Imperativo |
| 56 — The News | `vocabulario-de-noticias` | Vocabulario de noticias |
| 56 — The News | `should-shouldn-t` | Should/shouldn't |

**Acción pendiente (requiere el panel `/admin/ediciones` o acceso a la base
de datos — no es un cambio de código de este repo):** sacar estos 2
capítulos (4 lecciones) de la ruta `talleres`. Las lecciones en sí no se
borran — si existen en su ruta genérica propia (ej. inglés general),
siguen ahí sin cambios.

## Observación adicional (no confirmada, sin decidir)

Se detectaron otros capítulos con el mismo patrón de contenido genérico no
automotriz mezclado en esta ruta, que no fueron mencionados explícitamente
por el dueño pero siguen el mismo problema:

- Capítulo 52 — "A Job Interview" (`have-to`,
  `preparacion-de-entrevista-de-trabajo`)
- Capítulo 59 — "A Trip to Scotland" (`pasado-simple-completo`, `was-were`)
- Capítulo 51 — "If It Rains" (`primer-condicional`)

No se tocan hasta que el dueño confirme si también deben salir de
`talleres` o si se consideran parte de una base gramatical común
compartida entre rutas (a diferencia de cocina/noticias, que son
vocabulario temático específico sin relación con el rubro).
