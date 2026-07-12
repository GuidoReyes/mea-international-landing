# Task ID: 28

**Title:** Create Prisma models for CRM Phase 1: Alumno, Edicion, Inscripcion, Pago, CuotaPago, CRMEtapa

**Status:** done

**Dependencies:** 25 ✓

**Priority:** high

**Description:** Add all core CRM database models with proper relations, soft delete, and decimal precision for money fields

**Details:**

Add to backend/prisma/schema.prisma: Alumno (id, carnet unique auto-generated MEA-YYYY-####, nombre, apellido, email unique, whatsapp?, fechaNacimiento?, pais default 'GT', activo default true, creadoEn, password?, primerLogin default true, relations: inscripciones, certificados), Edicion (id, cursoId FK, nombre, fechaInicio, fechaFin, precio DECIMAL(10,2), precioUSD DECIMAL(10,2)?, cupo default 20, activo default true, instructor?, inscripciones relation), Inscripcion (id, alumnoId FK, edicionId FK, estado default 'ACTIVA' enum, creadoEn, pagos relation, certificado relation), Pago (id, inscripcionId FK, monto DECIMAL(10,2), montoUSD DECIMAL(10,2)?, moneda default 'GTQ', metodo enum, estado default 'PENDIENTE' enum, referencia?, creadoEn, cuotas relation), CuotaPago (id, pagoId FK, numeroCuota Int, monto DECIMAL(10,2), fechaVence DateTime, estado default 'PENDIENTE' enum, pagadoEn?). CRMEtapa (id, nombre, orden Int, color default '#00b4d8'). Extend Lead model: add etapaId Int? FK, valorEstimado DECIMAL(10,2)?, fechaCierreEstimada DateTime?, notasCRM String? @db.Text, asignadoAdminId Int?. Run npx prisma migrate dev --name fase1-crm-models.

**Test Strategy:**

Run migration successfully. Create seed script to insert 6 CRMEtapa records (Nuevo #3B82F6, Contactado #F59E0B, Interesado #8B5CF6, Propuesta #EC4899, Negociación #F97316, Cerrado #10B981). Use Prisma Studio to verify all models and relations work.

## Subtasks

### 28.1. Create enums for CRM status and payment fields in Prisma schema

**Status:** pending  
**Dependencies:** None  

Add all required enum types for InscripcionEstado, PagoEstado, MetodoPago, and Moneda to support the CRM models with proper type safety

**Details:**

Add to backend/prisma/schema.prisma after existing models:

enum InscripcionEstado {
  ACTIVA
  COMPLETADA
  CANCELADA
  SUSPENDIDA
}

enum PagoEstado {
  PENDIENTE
  COMPLETADO
  RECHAZADO
  REEMBOLSADO
}

enum MetodoPago {
  EFECTIVO
  TRANSFERENCIA
  TARJETA
  DEPOSITO
  OTRO
}

enum Moneda {
  GTQ
  USD
}

These enums will provide type safety and ensure consistent status values across the application. Follow Prisma convention of UPPER_CASE for enum values.

### 28.2. Create CRMEtapa, Alumno, and extend Lead models in Prisma schema

**Status:** pending  
**Dependencies:** 28.1  

Add CRMEtapa model for pipeline stages, complete Alumno model with auto-generated carnet, and extend existing Lead model with CRM fields

**Details:**

Add to backend/prisma/schema.prisma:

model CRMEtapa {
  id     Int    @id @default(autoincrement())
  nombre String
  orden  Int
  color  String @default("#00b4d8")
  leads  Lead[]
}

model Alumno {
  id               Int            @id @default(autoincrement())
  carnet           String         @unique
  nombre           String
  apellido         String
  email            String         @unique
  whatsapp         String?
  fechaNacimiento  DateTime?
  pais             String         @default("GT")
  activo           Boolean        @default(true)
  password         String?
  primerLogin      Boolean        @default(true)
  creadoEn         DateTime       @default(now())
  inscripciones    Inscripcion[]
  certificados     Certificado[]
}

Extend existing Lead model by adding these fields:
  etapaId              Int?
  etapa                CRMEtapa?    @relation(fields: [etapaId], references: [id])
  valorEstimado        Decimal?     @db.Decimal(10, 2)
  fechaCierreEstimada  DateTime?
  notasCRM             String?      @db.Text
  asignadoAdminId      Int?
  asignadoAdmin        Admin?       @relation(fields: [asignadoAdminId], references: [id])

Note: carnet generation logic (MEA-YYYY-####) will be handled in application code, not in database. Also add Admin relation array: leads Lead[] to Admin model.

### 28.3. Create Edicion, Inscripcion, and Certificado models with proper relations

**Status:** pending  
**Dependencies:** 28.2  

Add Edicion model linked to Curso, Inscripcion linking Alumno and Edicion, and Certificado model for course completion certificates

**Details:**

Add to backend/prisma/schema.prisma:

model Edicion {
  id            Int            @id @default(autoincrement())
  cursoId       Int
  curso         Curso          @relation(fields: [cursoId], references: [id])
  nombre        String
  fechaInicio   DateTime
  fechaFin      DateTime
  precio        Decimal        @db.Decimal(10, 2)
  precioUSD     Decimal?       @db.Decimal(10, 2)
  cupo          Int            @default(20)
  activo        Boolean        @default(true)
  instructor    String?
  inscripciones Inscripcion[]
}

model Inscripcion {
  id         Int               @id @default(autoincrement())
  alumnoId   Int
  alumno     Alumno            @relation(fields: [alumnoId], references: [id])
  edicionId  Int
  edicion    Edicion           @relation(fields: [edicionId], references: [id])
  estado     InscripcionEstado @default(ACTIVA)
  creadoEn   DateTime          @default(now())
  pagos      Pago[]
  certificado Certificado?
}

model Certificado {
  id            Int          @id @default(autoincrement())
  inscripcionId Int          @unique
  inscripcion   Inscripcion  @relation(fields: [inscripcionId], references: [id])
  alumnoId      Int
  alumno        Alumno       @relation(fields: [alumnoId], references: [id])
  codigo        String       @unique
  fechaEmision  DateTime     @default(now())
  revocado      Boolean      @default(false)
}

Also extend Curso model with: ediciones Edicion[]

### 28.4. Create Pago and CuotaPago models with payment tracking and installments

**Status:** pending  
**Dependencies:** 28.3  

Add payment tracking models supporting multiple currencies, payment methods, and installment plans with proper financial precision

**Details:**

Add to backend/prisma/schema.prisma:

model Pago {
  id             Int          @id @default(autoincrement())
  inscripcionId  Int
  inscripcion    Inscripcion  @relation(fields: [inscripcionId], references: [id])
  monto          Decimal      @db.Decimal(10, 2)
  montoUSD       Decimal?     @db.Decimal(10, 2)
  moneda         Moneda       @default(GTQ)
  metodo         MetodoPago
  estado         PagoEstado   @default(PENDIENTE)
  referencia     String?
  creadoEn       DateTime     @default(now())
  cuotas         CuotaPago[]
}

model CuotaPago {
  id           Int         @id @default(autoincrement())
  pagoId       Int
  pago         Pago        @relation(fields: [pagoId], references: [id])
  numeroCuota  Int
  monto        Decimal     @db.Decimal(10, 2)
  fechaVence   DateTime
  estado       PagoEstado  @default(PENDIENTE)
  pagadoEn     DateTime?
}

Use DECIMAL(10, 2) for all monetary fields to ensure precision. This supports amounts up to 99,999,999.99 in any currency. The CuotaPago model enables payment plans with multiple installments tracked independently.

### 28.5. Run Prisma migration and create seed script for CRMEtapa default stages

**Status:** pending  
**Dependencies:** 28.4  

Generate and apply database migration, then create seed script to populate 6 default CRM pipeline stages with proper colors and ordering

**Details:**

1. Run migration: npx prisma migrate dev --name fase1-crm-models

2. Create backend/src/scripts/seed-crm-etapas.ts:

import prisma from '../lib/prisma';

async function main() {
  const etapas = [
    { nombre: 'Nuevo', orden: 1, color: '#3B82F6' },
    { nombre: 'Contactado', orden: 2, color: '#F59E0B' },
    { nombre: 'Interesado', orden: 3, color: '#8B5CF6' },
    { nombre: 'Propuesta', orden: 4, color: '#EC4899' },
    { nombre: 'Negociación', orden: 5, color: '#F97316' },
    { nombre: 'Cerrado', orden: 6, color: '#10B981' }
  ];

  for (const etapa of etapas) {
    await prisma.cRMEtapa.upsert({
      where: { orden: etapa.orden },
      create: etapa,
      update: etapa
    });
  }

  console.log('CRM Etapas seeded successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

3. Add to package.json scripts: "seed:crm": "ts-node src/scripts/seed-crm-etapas.ts"

4. Run: npm run seed:crm
