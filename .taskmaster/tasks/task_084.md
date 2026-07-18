# Task ID: 84

**Title:** Implementar autenticación JWT para alumnos

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Crear endpoints de login y cambio de contraseña para alumnos con JWT separado del admin

**Details:**

Crear nuevos endpoints en `backend/src/routes/auth.ts`:

1. `POST /api/auth/alumno/login` (email + password):
   - Validar credenciales con bcrypt
   - Generar JWT con payload `{ alumnoId, email }` usando JWT_SECRET
   - Rate limiting con el middleware existente
   - Respuesta: `{ token, alumno: { id, nombre, apellido, email, primerLogin } }`

2. `POST /api/auth/alumno/cambiar-password`:
   - Requiere auth de alumno (verificar token)
   - Body: `{ passwordActual, passwordNueva }`
   - Validar password actual con bcrypt
   - Hash nueva password con bcrypt (rounds: 10)
   - Actualizar `Alumno.password` y `primerLogin=false`
   - Generar nuevo token

3. Crear middleware `verifyAlumnoJWT` en `backend/src/middleware/auth.middleware.ts`:
   - Similar a `verifyJWT` pero para payload de alumno
   - Extender `Express.Request` con `alumno?: { alumnoId, email }`
   - Variante `optionalAlumnoJWT` que no falla si no hay token (next sin error)

Tecnologías: bcrypt, jsonwebtoken, express middleware, Prisma

**Test Strategy:**

Unit tests:
- Login con credenciales válidas devuelve token
- Login con credenciales inválidas retorna 401
- Cambio de password exitoso actualiza password y primerLogin
- Cambio de password con password actual incorrecta retorna 401
- verifyAlumnoJWT rechaza tokens inválidos
- optionalAlumnoJWT permite requests sin token
