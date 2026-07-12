# Task ID: 25

**Title:** Create AuditoriaAdmin model and audit logging middleware

**Status:** done

**Dependencies:** 24 ✓

**Priority:** high

**Description:** Add audit trail table and middleware to track all admin actions on sensitive resources

**Details:**

Add to schema.prisma: model AuditoriaAdmin { id Int @id @default(autoincrement()), adminId Int, accion String, recurso String, detalle String?, ip String?, creadoEn DateTime @default(now()) }. Run npx prisma migrate dev --name add-auditoria-admin. Create backend/src/middleware/audit.middleware.ts exporting auditLog(accion: string, recurso: string) middleware. Extract adminId from req.admin (set by verifyJWT), ip from req.ip, detalle from JSON.stringify(req.body). Insert AuditoriaAdmin record using prisma. Apply middleware to existing POST/PATCH/DELETE routes in leads.ts, cursos.ts, auth.ts after verifyJWT.

**Test Strategy:**

Create/update/delete a lead via admin panel, query AuditoriaAdmin table to verify records created with correct adminId, accion, recurso, ip. Test that audit still works if detalle is large JSON.

## Subtasks

### 25.1. Add AuditoriaAdmin model to Prisma schema and run migration

**Status:** pending  
**Dependencies:** None  

Create the AuditoriaAdmin table in the database schema to store audit trail records for all admin actions

**Details:**

Add the following model to backend/prisma/schema.prisma after the Admin model:

model AuditoriaAdmin {
  id        Int      @id @default(autoincrement())
  adminId   Int
  accion    String
  recurso   String
  detalle   String?  @db.Text
  ip        String?
  creadoEn  DateTime @default(now())
}

Note: Use @db.Text for detalle field to handle large JSON payloads. After adding the model, run: cd backend && npx prisma migrate dev --name add-auditoria-admin. This will create the migration file and apply it to the database. Verify the migration was successful by checking the generated migration file in backend/prisma/migrations/.

### 25.2. Create audit logging middleware in backend/src/middleware/audit.middleware.ts

**Status:** pending  
**Dependencies:** 25.1  

Implement reusable middleware function that logs admin actions to the AuditoriaAdmin table

**Details:**

Create backend/src/middleware/audit.middleware.ts with the following implementation:

import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export function auditLog(accion: string, recurso: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.admin?.adminId;
      const ip = req.ip || req.socket.remoteAddress || null;
      const detalle = Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null;
      
      if (adminId) {
        await prisma.auditoriaAdmin.create({
          data: { adminId, accion, recurso, detalle, ip }
        });
      }
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't block request if audit fails
    }
    next();
  };
}

The middleware extracts adminId from req.admin (set by verifyJWT), IP from req.ip/socket, and body as JSON string. Errors are logged but don't block requests. Must be applied AFTER verifyJWT middleware.

### 25.3. Apply audit middleware to all POST/PATCH/DELETE routes in leads.ts

**Status:** pending  
**Dependencies:** 25.2  

Add auditLog middleware to sensitive lead management endpoints to track create/update operations

**Details:**

In backend/src/routes/leads.ts, import auditLog middleware:
import { auditLog } from '../middleware/audit.middleware';

Apply middleware to these routes AFTER verifyJWT:

- PATCH /leads/:id → auditLog('ACTUALIZAR_LEAD', 'leads')
  Route signature: router.patch('/:id', verifyJWT, auditLog('ACTUALIZAR_LEAD', 'leads'), async (req, res) => {...}

Note: There is no POST or DELETE route in leads.ts currently (leads are created via webhook), so only PATCH route needs middleware. The middleware should be placed between verifyJWT and the route handler function to ensure req.admin is populated before audit logging occurs.

### 25.4. Apply audit middleware to all POST/PATCH/DELETE routes in cursos.ts and auth.ts

**Status:** pending  
**Dependencies:** 25.2  

Add auditLog middleware to course management and authentication endpoints to complete audit coverage

**Details:**

In backend/src/routes/cursos.ts, import auditLog:
import { auditLog } from '../middleware/audit.middleware';

Apply middleware AFTER verifyJWT:
- POST /cursos → auditLog('CREAR_CURSO', 'cursos')
- PATCH /cursos/:id → auditLog('ACTUALIZAR_CURSO', 'cursos')
- DELETE /cursos/:id → auditLog('ELIMINAR_CURSO', 'cursos')

In backend/src/routes/auth.ts, auth.ts doesn't have verifyJWT on /login (it's the login endpoint), so audit logging here would need a different approach. For now, skip auth.ts since the user can't be authenticated during login. If needed later, add a post-login audit entry manually in the login handler after successful authentication using prisma.auditoriaAdmin.create directly.

Route signatures should be:
router.post('/', verifyJWT, auditLog('CREAR_CURSO', 'cursos'), async (req, res) => {...}
router.patch('/:id', verifyJWT, auditLog('ACTUALIZAR_CURSO', 'cursos'), async (req, res) => {...}
router.delete('/:id', verifyJWT, auditLog('ELIMINAR_CURSO', 'cursos'), async (req, res) => {...}
