# Task ID: 30

**Title:** Implement /api/ediciones routes with inscripcion creation endpoint

**Status:** done

**Dependencies:** 28 ✓, 29 ✓

**Priority:** high

**Description:** Create ediciones CRUD and POST /api/ediciones/:id/inscribir endpoint that creates Inscripcion + Pago with optional cuotas

**Details:**

Create backend/src/routes/ediciones.ts. GET /api/ediciones: filter cursoId, activo. Include curso, _count.inscripciones. GET /api/ediciones/:id: include inscripciones (nested: alumno, pagos with cuotas). POST /api/ediciones: Zod validate {cursoId, nombre, fechaInicio, fechaFin, precio, precioUSD?, cupo, instructor?}. Verify curso exists. PATCH /api/ediciones/:id: update fields. DELETE: soft-delete. POST /api/ediciones/:id/inscribir: Zod validate {alumnoId, monto, moneda, metodo, numeroCuotas?}. Use Prisma transaction: create Inscripcion, create Pago, if numeroCuotas>1 create CuotaPago records (distribute monto/numeroCuotas evenly, fechaVence = today + N months using date-fns or native Date). Apply auditLog to all mutating routes. Mount in index.ts.

**Test Strategy:**

Create edicion, inscribe alumno with numeroCuotas=3, verify 3 CuotaPago records created with correct monto split and fechaVence monthly intervals. Test transaction rollback if alumno doesn't exist.

## Subtasks

### 30.1. Create ediciones router file with basic CRUD structure and Zod schemas

**Status:** pending  
**Dependencies:** None  

Set up backend/src/routes/ediciones.ts with Express router, import dependencies (Prisma, Zod, auth middleware), and define Zod validation schemas for edicion creation and update

**Details:**

Create file backend/src/routes/ediciones.ts. Import Router, Request, Response from express, import prisma from '../lib/prisma', import verifyJWT from '../middleware/auth.middleware', import { z } from 'zod'. Define Zod schemas: createEdicionSchema with z.object({cursoId: z.number(), nombre: z.string().min(1), fechaInicio: z.string().or(z.date()), fechaFin: z.string().or(z.date()), precio: z.number().positive(), precioUSD: z.number().positive().optional(), cupo: z.number().int().positive(), instructor: z.string().optional()}), updateEdicionSchema as createEdicionSchema.partial(). Create router instance with const router = Router(). Export router as default. This establishes the foundation following the patterns used in cursos.ts and leads.ts.

### 30.2. Implement GET /api/ediciones list and GET /api/ediciones/:id detail endpoints

**Status:** pending  
**Dependencies:** 30.1  

Create paginated list endpoint with filters (cursoId, activo) that includes curso relation and inscription count, plus detail endpoint with full nested relations

**Details:**

In backend/src/routes/ediciones.ts, implement router.get('/', async (req, res) => {...}). Extract query params: page (default 1, max 100), limit (default 20), cursoId (optional filter as number), activo (optional boolean filter). Build Prisma where clause dynamically based on filters. Query prisma.edicion.findMany with where, pagination (skip, take), orderBy: {fechaInicio: 'desc'}, include: {curso: true, _count: {select: {inscripciones: true}}}. Return json with {data: ediciones, meta: {total, page, limit}} similar to leads.ts:9-28. Implement router.get('/:id', async (req, res) => {...}). Parse id from params, validate with isNaN check. Query prisma.edicion.findUnique with include: {inscripciones: {include: {alumno: true, pagos: {include: {cuotas: true}}}}}. Return 404 if not found, else return json. Follow error handling patterns from existing routes.

### 30.3. Implement POST /api/ediciones creation and PATCH /api/ediciones/:id update endpoints with curso validation

**Status:** pending  
**Dependencies:** 30.1, 30.2  

Create protected endpoints for creating and updating ediciones with Zod validation, curso existence check, and proper error handling

**Details:**

In backend/src/routes/ediciones.ts, implement router.post('/', verifyJWT, async (req, res) => {...}). Validate req.body with createEdicionSchema.safeParse(), return 400 with validation errors if invalid. Extract validated data. Query prisma.curso.findUnique({where: {id: cursoId}}) to verify curso exists, return 404 {error: 'Curso no encontrado'} if not found. Create edicion with prisma.edicion.create({data: validatedData}). Return 201 with created edicion. Implement router.patch('/:id', verifyJWT, async (req, res) => {...}). Parse and validate id from params. Validate req.body with updateEdicionSchema.safeParse(). If cursoId in update, verify curso exists. Update with prisma.edicion.update({where: {id}, data: validatedData}). Handle Prisma P2025 error (record not found) and return 404. Return updated edicion json. Follow patterns from cursos.ts:34-79.

### 30.4. Implement DELETE soft-delete endpoint and POST inscripcion creation with Prisma transaction

**Status:** pending  
**Dependencies:** 30.1, 30.2, 30.3  

Create soft-delete endpoint and complex inscripcion creation endpoint that handles Inscripcion + Pago + optional CuotaPago records in a single atomic transaction

**Details:**

Implement router.delete('/:id', verifyJWT, async (req, res) => {...}). Parse id, update prisma.edicion.update({where: {id}, data: {activo: false}}), return 204. Define inscribirSchema = z.object({alumnoId: z.number(), monto: z.number().positive(), moneda: z.enum(['ARS', 'USD']), metodo: z.enum(['efectivo', 'transferencia', 'tarjeta']), numeroCuotas: z.number().int().min(1).optional()}). Implement router.post('/:id/inscribir', verifyJWT, async (req, res) => {...}). Parse edicionId from params. Validate body with inscribirSchema. Use prisma.$transaction(async (tx) => {...}) following pattern from persistence.ts:12-38. Inside transaction: (1) Verify edicion exists with tx.edicion.findUnique, throw if not found. (2) Verify alumno exists with tx.alumno.findUnique, throw if not found. (3) Create inscripcion: tx.inscripcion.create({data: {alumnoId, edicionId, estado: 'activo'}}). (4) Create pago: tx.pago.create({data: {inscripcionId: inscripcion.id, monto, moneda, metodo, estado: 'pendiente'}}). (5) If numeroCuotas > 1, calculate montoPorCuota = monto / numeroCuotas, create array of cuotas with tx.cuotaPago.createMany({data: Array.from({length: numeroCuotas}, (_, i) => ({pagoId: pago.id, numero: i+1, monto: montoPorCuota, fechaVence: new Date(new Date().setMonth(new Date().getMonth() + i)), estado: 'pendiente'}))}). Return created inscripcion with includes. Wrap in try-catch, return 400 on transaction error.

### 30.5. Mount ediciones router in main app and add audit logging to mutating endpoints

**Status:** pending  
**Dependencies:** 30.1, 30.2, 30.3, 30.4  

Integrate the ediciones router into the Express app index.ts and implement audit logging for all POST, PATCH, DELETE operations following existing patterns

**Details:**

Update backend/src/index.ts to import edicionesRouter from './routes/ediciones' and mount with app.use('/api/ediciones', edicionesRouter). Verify order: mount after auth routes but before catch-all 404 handler. In ediciones.ts, create auditLog helper function following task details pattern (if auditLog implementation doesn't exist yet, stub it with console.log for now): async function auditLog(action: string, adminId: number, resourceType: string, resourceId: number, details?: any) { console.log(`[AUDIT] ${action} ${resourceType}:${resourceId} by admin:${adminId}`, details); }. Add auditLog calls to POST /api/ediciones after creation: await auditLog('CREATE', req.admin!.adminId, 'edicion', edicion.id), to PATCH after update: await auditLog('UPDATE', req.admin!.adminId, 'edicion', id), to DELETE after soft-delete: await auditLog('DELETE', req.admin!.adminId, 'edicion', id), to POST inscribir after transaction: await auditLog('INSCRIBIR', req.admin!.adminId, 'inscripcion', inscripcion.id, {alumnoId, edicionId, numeroCuotas}). Ensure req.admin is typed correctly from auth middleware (AdminPayload interface from auth.middleware.ts:4-8).
