# Task ID: 100

**Title:** Implementar GET /api/lecciones/:id/jugar para devolver contenido interactivo

**Status:** done

**Dependencies:** 97 ✓, 98 ✓, 99 ✓

**Priority:** medium

**Description:** Endpoint público/autenticado que devuelve el JSON de content si la lección es accesible (esGratis o suscripción activa)

**Details:**

En `backend/src/routes/lecciones.ts`, agregar `router.get('/:id/jugar', verifyAlumnoJWT, async (req, res) => {...})`. Importar `verifyAlumnoJWT` de `middleware/alumno-auth.middleware` y `tieneSuscripcionActiva` de `lib/suscripciones` (ya existen). Buscar la lección con `prisma.leccion.findUnique({ where: { id }, select: { id, titulo, esGratis, content } })`. Si no existe → 404. Si `!leccion.esGratis`, verificar `await tieneSuscripcionActiva(req.alumno.alumnoId)`. Si no activa → 403 con `{ error: 'Lección bloqueada', upgradeUrl: '/planes' }`. Si pasa, responder 200 con `{ leccion: { id, titulo, content } }`. Si content es null, devolver null (lección sin contenido interactivo, debe usar el viewer simple).

**Test Strategy:**

Prueba de integración: (1) lección esGratis=true con content → 200 con JSON, (2) lección esGratis=false sin suscripción activa → 403 con upgradeUrl, (3) lección esGratis=false con suscripción activa → 200, (4) lección con content=null → 200 con content:null, (5) ID inexistente → 404. Probar con token de alumno y sin token (verificar middleware).
