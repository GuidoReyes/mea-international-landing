# Task ID: 98

**Title:** Agregar campo content Json? al modelo Leccion en Prisma

**Status:** done

**Dependencies:** 97 ✓

**Priority:** high

**Description:** Extender el modelo Leccion con un campo opcional content de tipo Json para almacenar el JSON de LeccionContenido validado

**Details:**

Editar `backend/prisma/schema.prisma` línea 335-346 (modelo Leccion): agregar `content Json?` después de `esGratis Boolean @default(false)`. Ejecutar `npx prisma migrate dev --name add_leccion_content` localmente para crear la migración. Ejecutar `npx prisma db push` en el entorno de Railway para aplicar la migración sin crear archivos (migración aditiva, sin pérdida de datos). Verificar que los modelos existentes no se modifiquen y que el campo sea nullable para lecciones antiguas sin contenido interactivo.

**Test Strategy:**

Verificar que `npx prisma db push` se ejecute sin errores en Railway. Consultar la tabla Leccion en MySQL y verificar que la columna `content` exista con tipo JSON nullable. Crear una lección de prueba con content=null y otra con content={version:1,steps:[...]} para confirmar que ambos casos funcionen.
