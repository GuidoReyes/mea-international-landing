# Task ID: 108

**Title:** Generar 3 lecciones seed para capítulo 'Diálogos del taller' con generate-leccion.ts

**Status:** done

**Dependencies:** 104 ✓, 107 ✓

**Priority:** medium

**Description:** Ejecutar el script de generación para crear lecciones interactivas de ejemplo en el curso 'ingles-talleres-mecanicos'

**Details:**

Ejecutar `npx ts-node scripts/generate-leccion.ts` 3 veces con estos parámetros: (1) `--curso 'ingles-talleres-mecanicos' --capitulo 'Diálogos del taller' --tema 'Recibir al cliente' --nivel 'A1' --frases 'Good morning|Buenos días;What is the problem?|¿Cuál es el problema?;My car makes a noise|Mi carro hace un ruido;Let me check|Déjame revisar'`, marcar esGratis=true en la BD tras generarla. (2) `--curso 'ingles-talleres-mecanicos' --capitulo 'Diálogos del taller' --tema 'Las partes básicas' --nivel 'A1' --frases 'The engine|El motor;The brakes|Los frenos;The oil|El aceite;The battery is dead|La batería está muerta;Check the tire|Revise la llanta'`. (3) `--curso 'ingles-talleres-mecanicos' --capitulo 'Diálogos del taller' --tema 'Cotizar y despedir' --nivel 'A1' --frases 'It costs fifty dollars|Cuesta cincuenta dólares;It will be ready tomorrow|Estará listo mañana;Thank you|Gracias;See you later|Hasta luego'`. Verificar que las lecciones se creen con orden 1, 2, 3 en el capítulo, y que los audios se sinteticen y suban a R2 (si configurado). Actualizar manualmente `esGratis=true` solo para la primera lección en la BD.

**Test Strategy:**

Verificar en BD que las 3 lecciones existan con `content` válido. Acceder a `/cursos/ingles-talleres-mecanicos` y verificar que el capítulo 'Diálogos del taller' aparezca con 3 lecciones. Jugar la lección 1 (gratis) sin login, verificar que funcione. Intentar jugar lección 2 sin suscripción → debe bloquear. Jugar con suscripción activa → debe funcionar. Reproducir audios en cada paso, verificar que suenen correctos.
