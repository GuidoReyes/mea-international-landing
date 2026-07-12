# Task ID: 29

**Title:** Implement /api/alumnos CRUD routes with carnet auto-generation

**Status:** done

**Dependencies:** 28 ✓

**Priority:** high

**Description:** Create Express router for alumnos with pagination, search, and automatic MEA-YYYY-#### carnet generation

**Details:**

Install zod: npm install zod in backend. Create backend/src/routes/alumnos.ts with Express Router. All routes use verifyJWT middleware. GET /api/alumnos: query params page, limit, search (nombre/email/carnet LIKE), activo filter. Return paginated list with _count.inscripciones. GET /api/alumnos/:id: include inscripciones (nested: edicion, pagos), last 5 conversaciones. POST /api/alumnos: Zod schema validates {nombre, apellido, email, whatsapp?, pais?, fechaNacimiento?}. Generate carnet: const year=new Date().getFullYear(); const count=await prisma.alumno.count({where:{carnet:{startsWith:`MEA-${year}-`}}}}); const carnet=`MEA-${year}-${String(count+1).padStart(4,'0')}`; Hash random temp password with bcrypt. PATCH /api/alumnos/:id: update allowed fields (not carnet). DELETE: soft-delete (activo=false). Apply auditLog middleware to POST/PATCH/DELETE. Mount in src/index.ts: app.use('/api/alumnos', alumnosRouter).

**Test Strategy:**

Create alumnos via POST, verify carnet format MEA-2026-0001, 0002 etc. Test pagination and search filters. Verify soft-delete doesn't remove from DB. Test include relations return correct nested data.

## Subtasks

### 29.1. Install zod validation library in backend

**Status:** pending  
**Dependencies:** None  

Add zod npm package to backend project for runtime type validation and schema definitions

**Details:**

Navigate to /Users/guidoreyes/Desktop/proyecto/backend and run 'npm install zod' to add the zod validation library. This will be used for validating request body schemas in the alumnos routes, particularly for POST and PATCH operations. Zod provides runtime type checking and works well with TypeScript inference. Verify installation by checking package.json includes zod in dependencies.

### 29.2. Create alumnos router file with basic Express Router setup

**Status:** pending  
**Dependencies:** 29.1  

Create backend/src/routes/alumnos.ts with Express Router import and verifyJWT middleware configuration following existing route patterns

**Details:**

Create new file at /Users/guidoreyes/Desktop/proyecto/backend/src/routes/alumnos.ts. Import Router, Request, Response from express. Import prisma from '../lib/prisma'. Import verifyJWT from '../middleware/auth.middleware'. Import z from 'zod'. Initialize Express Router with const router = Router(). Export default router at end of file. Follow same patterns as backend/src/routes/cursos.ts:1-6 and backend/src/routes/leads.ts:1-5 for consistent structure.

### 29.3. Implement GET /api/alumnos with pagination, search, and activo filter

**Status:** pending  
**Dependencies:** 29.2  

Create paginated list endpoint with query params for page, limit, search (LIKE on nombre/email/carnet), activo filter, and include _count.inscripciones

**Details:**

In backend/src/routes/alumnos.ts, implement router.get('/', verifyJWT, async (req, res) => {}). Parse query params: page (default 1, Math.max 1), limit (default 10, Math.min 100), search (string), activo (boolean parse). Build Prisma where clause: if activo provided, add to where. If search provided, use OR array with nombre, apellido, email, carnet containing search (case insensitive with mode: 'insensitive'). Use Promise.all to fetch alumnos with skip/take pagination, orderBy creadoEn desc, include _count.inscripciones, and total count. Return {data: alumnos, meta: {total, page, limit}} following pattern in backend/src/routes/leads.ts:9-28. Handle errors with try-catch.

### 29.4. Implement GET /api/alumnos/:id with inscripciones and last 5 conversaciones

**Status:** pending  
**Dependencies:** 29.2  

Create detail endpoint that returns single alumno with nested inscripciones (including edicion and pagos) and last 5 conversaciones ordered by date

**Details:**

In backend/src/routes/alumnos.ts, implement router.get('/:id', verifyJWT, async (req, res) => {}). Parse id with parseInt(req.params.id), validate with isNaN check returning 400 'ID inválido' if invalid (follow backend/src/routes/leads.ts:32-36 pattern). Use prisma.alumno.findUnique with include: {inscripciones: {include: {edicion: true, pagos: true}}, conversaciones: {orderBy: {creadoEn: 'desc'}, take: 5}}. If not found, return 404 {error: 'Alumno no encontrado'}. Otherwise return alumno object. Wrap in try-catch for error handling.

### 29.5. Implement POST, PATCH, DELETE routes with carnet generation and mount router in index.ts

**Status:** pending  
**Dependencies:** 29.3, 29.4  

Create POST endpoint with zod validation and MEA-YYYY-#### carnet auto-generation, PATCH for updates, soft-delete DELETE, and mount router in main app

**Details:**

In backend/src/routes/alumnos.ts, define Zod schema: const alumnoSchema = z.object({nombre: z.string().min(1), apellido: z.string().min(1), email: z.string().email(), whatsapp: z.string().optional(), pais: z.string().optional(), fechaNacimiento: z.string().datetime().optional()}). POST /api/alumnos with verifyJWT: validate body with alumnoSchema.parse() in try-catch returning 400 on validation error. Generate carnet: const year = new Date().getFullYear(); const count = await prisma.alumno.count({where: {carnet: {startsWith: `MEA-${year}-`}}}); const carnet = `MEA-${year}-${String(count + 1).padStart(4, '0')}`; Import bcrypt, generate temp password, hash it. Create alumno with prisma.alumno.create(). PATCH /:id: similar validation but partial schema, update allowed fields excluding carnet. DELETE /:id: soft delete with prisma.alumno.update({where: {id}, data: {activo: false}}), return 204 (follow backend/src/routes/cursos.ts:81-91). In backend/src/index.ts, add after line 42: app.use('/api/alumnos', alumnosRouter); with proper import at top.
