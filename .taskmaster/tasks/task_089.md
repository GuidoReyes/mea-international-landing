# Task ID: 89

**Title:** Crear frontend: página /alumno/login y helpers de autenticación

**Status:** done

**Dependencies:** 84 ✓

**Priority:** high

**Description:** Página de login para alumnos y helpers para manejar tokens separados del admin

**Details:**

1. Crear `lib/alumno-api.ts` con helpers client-side:
   - `loginAlumno(email, password)`: POST a /api/auth/alumno/login, guardar token en localStorage como `mea_alumno_token`
   - `cambiarPasswordAlumno(passwordActual, passwordNueva)`: POST a /api/auth/alumno/cambiar-password con header Authorization
   - `getAlumnoToken()`: leer token de localStorage
   - `logoutAlumno()`: borrar token de localStorage
   - `fetchAlumno(endpoint, options)`: wrapper de fetch con Authorization header automático

2. Crear `app/alumno/login/page.tsx`:
   - Form con email y password
   - Submit llama a `loginAlumno`
   - Si `primerLogin=true`, redirigir a `/alumno/cambiar-password` pasando token
   - Si `primerLogin=false`, redirigir a `/mis-cursos`
   - Mostrar errores de validación
   - Estilos Tailwind coherentes con brand (#0A2540, #00C4B4)

3. Crear `app/alumno/cambiar-password/page.tsx`:
   - Form con passwordActual y passwordNueva (confirmación)
   - Submit llama a `cambiarPasswordAlumno`
   - Redirigir a `/mis-cursos` después del cambio exitoso

Tecnologías: Next.js 16 App Router, React hooks, localStorage, fetch API

**Test Strategy:**

E2E tests:
- Login exitoso guarda token y redirige
- Login con credenciales incorrectas muestra error
- Primer login redirige a cambiar password
- Cambio de password exitoso redirige a mis-cursos
- Logout borra token correctamente
