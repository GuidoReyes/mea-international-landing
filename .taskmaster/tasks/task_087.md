# Task ID: 87

**Title:** Modificar endpoint GET /api/cursos-online/:slug con progreso personalizado

**Status:** done

**Dependencies:** 84 ✓, 85 ✓

**Priority:** high

**Description:** Extender endpoint para incluir progreso y desbloqueo de lecciones cuando hay sesión de alumno

**Details:**

Modificar `GET /api/cursos-online/:slug` en `backend/src/routes/cursos-online.ts`:

1. Cambiar a usar middleware `optionalAlumnoJWT` (no requerir auth, pero aceptarla)
2. Si hay `req.alumno`, buscar:
   - `InscripcionOnline` del alumno para este curso
   - Todos los `ProgresoLeccion` del alumno para las lecciones del curso
   - `Suscripcion` ACTIVA del alumno (estado=ACTIVA y fechaFin > now)
3. Para cada lección, calcular:
   - `completada`: existe ProgresoLeccion.completada=true
   - `puntaje`: ProgresoLeccion.puntaje si existe
   - `bloqueada`: false si esGratis=true O tiene suscripción ACTIVA vigente
   - `urlContenido`: null si bloqueada=true, string si desbloqueada
4. Agregar al response:
   - `progresoPorcentaje`: (lecciones completadas / total lecciones) * 100
   - `inscrito`: boolean (existe InscripcionOnline)
   - `tieneSuscripcionActiva`: boolean
5. **Importante**: Solo cachear en Redis la versión anónima (sin alumno). Si hay alumno, no usar caché.

Tecnologías: Express middleware, Prisma joins, Redis cache control

**Test Strategy:**

Integration tests:
- Request sin auth devuelve versión anónima (sin progreso)
- Request con auth devuelve progreso real por lección
- Lecciones gratuitas siempre desbloqueadas
- Lecciones premium bloqueadas sin suscripción activa
- Lecciones premium desbloqueadas con suscripción activa
- Lecciones premium bloqueadas con suscripción vencida
- progresoPorcentaje calculado correctamente
- Cache NO se usa cuando hay auth
