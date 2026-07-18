# Task ID: 105

**Title:** Crear componentes React para los 6 tipos de pasos del LessonPlayer

**Status:** done

**Dependencies:** 97 ✓

**Priority:** high

**Description:** Implementar IntroStep, ListenLearnStep, MultipleChoiceStep, ArrangeWordsStep, FillBlankStep, WriteWordStep en components/cursos-online/lesson-steps/

**Details:**

Crear directorio `components/cursos-online/lesson-steps/`. Crear un archivo por componente: `IntroStep.tsx` (título + body con markdown simple), `ListenLearnStep.tsx` (phraseEn + phraseEs, botón play con <audio>, botones 1X y lenta con playbackRate), `MultipleChoiceStep.tsx` (question, audio opcional, opciones como botones, feedback inmediato verde/rojo, reintento 'Start over'), `ArrangeWordsStep.tsx` (phraseEs arriba, palabras arrastrables con @dnd-kit/core, verificar orden al soltar), `FillBlankStep.tsx` (sentenceParts con espacio en blanco, opciones como botones, rellenar y verificar), `WriteWordStep.tsx` (promptEs, input de texto con hints de letras, validar exactitud ignorando case/acentos con normalize('NFD')). Todos deben recibir props del tipo de paso + callback onComplete(correcto: boolean). Usar colores de marca MEA (#0A2540 primario, #00C4B4 acento) y Tailwind con clases de rounded-2xl, shadow-sm, bg-white. Feedback: banner verde 'Correcto! {traducción}' o rojo 'Intenta de nuevo' con botón 'Start over'.

**Test Strategy:**

Prueba de componente aislado con Storybook o página de prueba: renderizar cada paso con datos de ejemplo, verificar que el audio se reproduzca, que las opciones sean clicables, que el drag&drop funcione, que el feedback se muestre correctamente. Probar casos edge: sin audio, sin opciones, respuesta correcta al primer intento, múltiples reintentos.
