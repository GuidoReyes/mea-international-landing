# Task ID: 160

**Title:** Implement email+password registration endpoint

**Status:** done

**Dependencies:** 158 ✓

**Priority:** high

**Description:** Create backend endpoint for traditional email/password registration with auto-generated carnet

**Details:**

In backend/src/routes/auth-alumno.ts add POST /registro endpoint. Accept: nombre, apellido, email, password. Validate: email format (regex), password min 8 chars, all fields present. Check email not already registered. Generate carnet: query max carnet starting with 'WEB-', extract number, increment (e.g., WEB-0001, WEB-0002). Hash password with bcrypt (BCRYPT_ROUNDS=12). Create Alumno with: carnet, nombre, apellido, email, password (hashed), activo=true, primerLogin=true. Generate JWT with alumnoId + email. Return: token, alumno data. Add rate limiting by IP (use existing pattern from login). Include audit logging.

**Test Strategy:**

Test registration with valid data, verify carnet auto-generated correctly and increments, verify password hashed (never stored plain), verify duplicate email rejected, test weak passwords rejected, test JWT returned works for protected endpoints, verify rate limiting works
