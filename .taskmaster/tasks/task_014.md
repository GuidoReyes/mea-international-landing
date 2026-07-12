# Task ID: 14

**Title:** Implement JWT Authentication System

**Status:** done

**Dependencies:** 3 ✓

**Priority:** medium

**Description:** Create authentication endpoints for admin login and JWT middleware to protect admin routes.

**Details:**

Install bcrypt and jsonwebtoken: `npm install bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken`. Create `src/routes/auth.ts`. Implement POST /api/auth/login: accept {email, password}, find Admin by email, compare password with bcrypt.compare, if valid generate JWT with payload {adminId, email, rol} using JWT_SECRET with 24h expiration, return {token, admin: {id, email, nombre, rol}}. Create `src/middleware/auth.middleware.ts`: implement verifyJWT function that reads Authorization header (Bearer token), verifies with jwt.verify and JWT_SECRET, attaches decoded payload to req.user, returns 401 if invalid/missing/expired. Apply auth middleware to protected routes: POST/PATCH/DELETE /api/cursos, GET/PATCH /api/leads. Create seed script to create initial admin: use bcrypt.hash to hash password, insert into Admin table.

**Test Strategy:**

Run seed script to create admin with email 'admin@mea.com' and password 'admin123'. Test POST /api/auth/login with correct credentials - should return token. Test with wrong password - should return 401. Test protected route without token - should return 401. Test with valid token - should allow access. Test with expired token (manually create with past exp) - should return 401.
