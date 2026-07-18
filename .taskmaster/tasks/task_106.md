# Task ID: 106

**Title:** Implementar componente LessonPlayer con navegación de pasos y cálculo de puntaje

**Status:** done

**Dependencies:** 105 ✓

**Priority:** high

**Description:** Componente orquestador que renderiza los pasos secuencialmente, muestra progreso, calcula score y llama al endpoint de completar

**Details:**

Crear `components/cursos-online/LessonPlayer.tsx`. Props: `leccionId: number`, `content: LeccionContenido`, `onExit: () => void`. Estado: `currentStepIndex: number`, `respuestas: boolean[]` (array de correctos al primer intento), `erroresPorPaso: number[]`. Renderizar barra de progreso arriba (%) con `(currentStepIndex / content.steps.length) * 100`, botón X que llama onExit. Renderizar el paso actual usando switch/map sobre `content.steps[currentStepIndex].type` → componente correspondiente. Botón 'Continuar' abajo que solo se habilita tras recibir feedback (onComplete del paso hijo). Al avanzar, guardar respuesta en `respuestas[]` (true si correcto al primer intento, false si requirió reintentos). Al llegar al último paso, mostrar pantalla de cierre con score calculado como `(respuestas.filter(r => r).length / respuestas.length) * 100`. Llamar `alumnoApi.completarLeccion(leccionId, Math.round(score))`. Botón 'Siguiente lección' o 'Volver al curso'. Usar animaciones con framer-motion para transiciones entre pasos.

**Test Strategy:**

Prueba de integración con mock de alumnoApi: renderizar LessonPlayer con contenido de ejemplo (3-4 pasos), completar todos correctamente, verificar que score sea 100 y que se llame a completarLeccion. Completar con errores, verificar que score baje. Probar navegación (avanzar/retroceder si se implementa), verificar que el progreso se actualice. Probar onExit.
