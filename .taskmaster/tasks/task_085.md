# Task ID: 85

**Title:** Crear endpoints de inscripción y progreso de lecciones

**Status:** done

**Dependencies:** 84 ✓

**Priority:** high

**Description:** Implementar inscripción gratuita a cursos y registro de progreso por lección

**Details:**

Crear en `backend/src/routes/cursos-online.ts`:

1. `POST /api/cursos-online/:slug/inscribir` (auth alumno requerido):
   - Buscar curso por slug y verificar que esté publicado
   - Crear `InscripcionOnline` (alumnoId + cursoOnlineId)
   - Usar `upsert` para idempotencia (unique constraint)
   - Respuesta: `{ id, alumnoId, cursoOnlineId, iniciadaEn }`

2. `POST /api/lecciones/:id/completar` (auth alumno requerido):
   - Body: `{ puntaje?: number }` (validar 0-100 con Zod)
   - Verificar que la lección existe
   - Verificar acceso: esGratis=true O alumno tiene suscripción ACTIVA vigente (estado=ACTIVA y fechaFin > now)
   - Upsert `ProgresoLeccion`: `{ alumnoId, leccionId, completada: true, puntaje, completadaEn: now }`
   - Después del upsert, verificar si TODAS las lecciones del curso están completadas
   - Si 100% completado, calcular promedio de puntaje (solo lecciones con puntaje no null)
   - Si promedio >= 85, llamar helper `generateCertificadoOnline` (ver tarea 86)
   - Respuesta: `{ completada: true, puntaje, certificadoEmitido?: boolean }`

Tecnologías: Express, Prisma upsert, Zod validation

**Test Strategy:**

Integration tests:
- Inscripción exitosa crea registro idempotente
- Inscripción duplicada no falla
- Completar lección gratis sin suscripción funciona
- Completar lección premium sin suscripción retorna 403
- Completar lección premium con suscripción ACTIVA funciona
- Completar lección premium con suscripción VENCIDA retorna 403
- Puntaje inválido (<0 o >100) retorna 400
- Completar última lección con promedio >= 85 emite certificado
