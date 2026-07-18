# Task ID: 99

**Title:** Implementar POST /api/admin/lecciones/:id/content para guardar contenido interactivo

**Status:** done

**Dependencies:** 97 ✓, 98 ✓

**Priority:** high

**Description:** Endpoint protegido solo para admin que valida el JSON de contenido con Zod y lo guarda en la BD

**Details:**

Crear/extender `backend/src/routes/lecciones.ts` (ya existe para POST /:id/completar). Agregar `import { verifyJWT } from '../middleware/auth.middleware'` (middleware de admin existente). Implementar `router.post('/:id/content', verifyJWT, async (req, res) => {...})`. Parsear req.body con `leccionContenidoSchema.safeParse(req.body)`. Si falla, responder 400 con `{ error: 'Contenido inválido', issues: result.error.issues }` (issues de Zod en formato estructurado para el cliente). Si pasa, ejecutar `await prisma.leccion.update({ where: { id: leccionId }, data: { content: result.data } })`. Responder 200 con `{ success: true }`. Manejar 404 si la lección no existe. Registrar en `backend/src/index.ts` la ruta como `app.use('/api/lecciones', leccionesRoutes)` si no está ya.

**Test Strategy:**

Prueba de integración: (1) enviar JSON inválido (type incorrecto, campo faltante) y verificar respuesta 400 con issues de Zod, (2) enviar JSON válido y verificar 200 + contenido guardado en BD, (3) verificar que solo admins autenticados puedan acceder (sin token → 401, token de alumno → 403), (4) intentar con ID de lección inexistente → 404. Usar Thunder Client o Postman.
