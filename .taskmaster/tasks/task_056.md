# Task ID: 56

**Title:** Modelo Escalada — Log de escaladas en Prisma

**Status:** pending

**Dependencies:** 45

**Priority:** medium

**Description:** Registrar historial completo de escaladas a humano en base de datos con modelo Prisma Escalada.

**Details:**

No details provided.

**Test Strategy:**

No test strategy provided.

## Subtasks

### 56.1. schema.prisma — agregar modelo Escalada y migrar

**Status:** pending  
**Dependencies:** None  

Agregar modelo Escalada al schema.prisma: id String @id @default(cuid()), telefono String, motivo String, etapaPrevia String, reactivadoPor String @default('timeout') (valores: 'timeout' o 'mirce_manual'), reactivadoEn DateTime? (nullable), creadoEn DateTime @default(now()), relación lead Lead @relation(fields:[telefono], references:[telefono]). Agregar también escaladas Escalada[] en el modelo Lead existente. Correr: npx prisma migrate dev --name add_escaladas_log

### 56.2. claude.ts — crear registro Escalada al escalar

**Status:** pending  
**Dependencies:** 56.1  

Dentro del bloque if parsed.accion === 'escalar_humano' (subtarea 55.5): 1) Antes de actualizar la etapa del lead, consultar su etapa actual, 2) Crear registro con prisma.escalada.create({ data: { telefono, motivo: parsed.motivo, etapaPrevia: etapaActual } }). Este registro queda con reactivadoPor='timeout' por default hasta que se llame la reactivación manual.

### 56.3. whatsapp.webhook.ts — marcar reactivación manual en Escalada

**Status:** pending  
**Dependencies:** 56.1  

Dentro del handler del comando /bot (subtarea 55.7), después de desactivarModoHumano(): Llamar prisma.escalada.updateMany({ where: { telefono: telefonoCliente, reactivadoEn: null }, data: { reactivadoPor: 'mirce_manual', reactivadoEn: new Date() } }). Esto cierra correctamente el registro de escalada abierto.
