# Task ID: 97

**Title:** Crear contrato de tipos TypeScript y schema Zod para LeccionContenido

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Definir tipos discriminados para los 6 tipos de pasos (intro, listen_learn, multiple_choice, arrange_words, fill_blank, write_word) y validarlos con Zod

**Details:**

Crear `backend/src/types/leccion-contenido.ts` exportando los tipos `PasoLeccion` (union discriminada con `type`) y `LeccionContenido` (version + steps). Crear `backend/src/schemas/leccion-contenido.schema.ts` con schemas Zod individuales por tipo de paso y un `z.discriminatedUnion("type", [...])` para validar todo el contenido. Exportar `leccionContenidoSchema: z.ZodType<LeccionContenido>` y `type LeccionContenidoInput = z.infer<typeof leccionContenidoSchema>`. Asegurar que audioUrl sea string en listen_learn y opcional en multiple_choice, correctIndex/correctOrder sean números enteros válidos, arrays de opciones/palabras no estén vacíos, y todos los campos de texto sean strings no vacíos.

**Test Strategy:**

Pruebas unitarias con Vitest/Jest: validar casos válidos para cada tipo de paso, casos inválidos (type incorrecto, campos faltantes, índices fuera de rango, arrays vacíos), y que safeParse devuelva los errores esperados de Zod con mensajes claros. Verificar que TypeScript infiera los tipos correctamente.
