# Task ID: 109

**Title:** Validación end-to-end: lección interactiva completa desde generación hasta certificado

**Status:** done

**Dependencies:** 108 ✓

**Priority:** high

**Description:** Flujo completo: generar lección → jugar en navegador → completar con puntaje → verificar certificado si promedio >= 85

**Details:**

Prueba manual end-to-end: (1) Generar una lección nueva con generate-leccion.ts (tema no usado), verificar que se guarde en BD con content válido y audios. (2) Loguearse como alumno con suscripción activa, acceder a la lección en `/cursos/{slug}/leccion/{leccionSlug}`. (3) Completar todos los pasos correctamente (100%), verificar que el score se calcule bien. (4) Verificar que se llame a `POST /api/lecciones/:id/completar` con puntaje correcto. (5) Si el alumno ya tiene otras lecciones del curso completadas y el promedio llega a 85+, verificar que se emita el certificado automáticamente (llamada a `emitirCertificadoOnlineSiCorresponde` ya existe en lecciones.ts). (6) Verificar que el certificado aparezca con `urlPdf` si R2 está configurado, o sin urlPdf (modo degradado). (7) Acceder al certificado en `/verify-online/{codigo}` y verificar que se vea correctamente. Probar también con puntaje bajo (<85) y verificar que NO se emita certificado.

**Test Strategy:**

Checklist manual: [ ] Lección generada sin errores, [ ] LessonPlayer renderiza todos los pasos, [ ] Audio se reproduce, [ ] Feedback correcto/incorrecto funciona, [ ] Score se calcula bien, [ ] Puntaje se guarda en BD, [ ] Certificado se emite si promedio >= 85, [ ] Certificado NO se emite si promedio < 85, [ ] PDF se sube a R2 (si configurado), [ ] Verificación pública funciona. Documentar cualquier regresión en lecciones sin content.
