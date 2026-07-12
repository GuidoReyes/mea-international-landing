# Task ID: 3

**Title:** Create Prisma Schema with All Database Models

**Status:** done

**Dependencies:** 2 ✓

**Priority:** high

**Description:** Define complete Prisma schema with Lead, Curso, ConversacionWhatsApp, MensajeWhatsApp, and Admin models. Configure relationships and constraints.

**Details:**

Install Prisma: `npm install prisma @prisma/client`, `npx prisma init`. Create `prisma/schema.prisma` with datasource (mysql, env DATABASE_URL) and generator (prisma-client-js). Define models exactly as specified in PRD REQ-002: Lead (id, telefono UNIQUE, nombre nullable, email nullable, interes nullable, estado default 'nuevo', creadoEn, actualizadoEn, conversaciones relation), Curso (id, nombre, descripcion Text, precio Decimal(10,2), modalidad, duracion, activo default true, creadoEn), ConversacionWhatsApp (id, leadId nullable FK to Lead, telefono, mensajes relation, estado default 'activo', creadoEn), MensajeWhatsApp (id, conversacionId FK to ConversacionWhatsApp, rol enum user/assistant, contenido Text, creadoEn), Admin (id, email UNIQUE, password, nombre, rol default 'ADMIN', activo default true, creadoEn). Create `src/lib/prisma.ts` with PrismaClient singleton export.

**Test Strategy:**

Run `npx prisma generate` - should complete without errors. Run `npx prisma migrate dev --name init` to create migration. Verify migration files created. Check MySQL database in Railway shows all tables with correct columns and constraints. Test Prisma client import in index.ts.

## Subtasks

### 3.1. Install Prisma dependencies and initialize Prisma configuration

**Status:** pending  
**Dependencies:** None  

Install @prisma/client and prisma as dependencies, then run npx prisma init to create the initial Prisma setup with schema.prisma and .env template.

**Details:**

Run `npm install prisma @prisma/client` to add Prisma packages to package.json. Then execute `npx prisma init` which creates: (1) prisma/schema.prisma file with boilerplate structure, (2) .env file with DATABASE_URL placeholder. Verify that prisma/ directory exists and schema.prisma contains default datasource db and generator client blocks. This establishes the foundation for defining database models. The .env file should be added to .gitignore if not already present.

### 3.2. Configure Prisma datasource and generator for MySQL

**Status:** pending  
**Dependencies:** 3.1  

Update prisma/schema.prisma to configure MySQL as the database provider and set up the Prisma Client generator with correct settings.

**Details:**

Edit prisma/schema.prisma to set: (1) datasource db with provider = 'mysql' and url = env('DATABASE_URL'), (2) generator client with provider = 'prisma-client-js'. The datasource block should reference the DATABASE_URL environment variable which will be populated from Railway MySQL addon. Ensure the file uses proper Prisma schema syntax. This step prepares the schema file to accept model definitions and ensures Prisma knows to generate a MySQL-compatible client.

### 3.3. Define all five database models with fields, types, and relationships

**Status:** pending  
**Dependencies:** 3.2  

Add Lead, Curso, ConversacionWhatsApp, MensajeWhatsApp, and Admin models to schema.prisma with exact field definitions, data types, constraints, and relationships as specified in REQ-002.

**Details:**

Add to prisma/schema.prisma: (1) Lead model with id Int @id @default(autoincrement()), telefono String @unique, nombre String?, email String?, interes String?, estado String @default('nuevo'), creadoEn DateTime @default(now()), actualizadoEn DateTime @updatedAt, conversaciones ConversacionWhatsApp[]; (2) Curso model with id, nombre, descripcion String @db.Text, precio Decimal @db.Decimal(10,2), modalidad, duracion, activo Boolean @default(true), creadoEn; (3) ConversacionWhatsApp model with id, leadId Int?, telefono, lead Lead? @relation(fields: [leadId], references: [id]), mensajes MensajeWhatsApp[], estado @default('activo'), creadoEn; (4) MensajeWhatsApp model with id, conversacionId, conversacion ConversacionWhatsApp @relation(fields: [conversacionId], references: [id]), rol enum-like String (user/assistant), contenido @db.Text, creadoEn; (5) Admin model with id, email @unique, password, nombre, rol @default('ADMIN'), activo @default(true), creadoEn. Ensure all foreign key relationships are properly defined with @relation directives.

### 3.4. Create Prisma Client singleton and verify schema is ready for migration

**Status:** pending  
**Dependencies:** 3.3  

Create src/lib/prisma.ts with a PrismaClient singleton instance for database access, then run prisma generate to create the Prisma Client based on the schema.

**Details:**

Create src/lib/prisma.ts file with: (1) Import PrismaClient from '@prisma/client', (2) Implement singleton pattern to prevent multiple PrismaClient instances in development (check globalThis.prisma), (3) Export a single prisma instance with proper TypeScript types. Pattern should follow Prisma best practices: const prismaClientSingleton = () => new PrismaClient(); declare global { var prisma: undefined | ReturnType<typeof prismaClientSingleton> }; const prisma = globalThis.prisma ?? prismaClientSingleton(); export default prisma; if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma. After creating the file, run `npx prisma generate` which reads schema.prisma and generates the type-safe Prisma Client in node_modules/@prisma/client with all model types and methods. This makes the schema ready for migration once DATABASE_URL is configured in Railway.
