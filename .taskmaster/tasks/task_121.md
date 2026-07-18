# Task ID: 121

**Title:** Extend Prisma schema with live class models

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Add GrupoClaseEnVivo and HorarioClase models to schema.prisma, plus incluyeClasesEnVivo field to Plan model

**Details:**

Add the two new models exactly as specified in the PRD:

```prisma
model GrupoClaseEnVivo {
  id              Int                 @id @default(autoincrement())
  slug            String              @unique
  nombre          String
  audiencia       String              // "ninos" | "adolescentes" | "adultos" | "general"
  niveles         String              // "A1" | "A2" | "B2,C1" | "PRE_A1" | "PRE_BEGINNERS" | "A1,A2"
  descripcion     String?             @db.Text
  profesor        String?
  urlZoom         String              // placeholder inicial "https://zoom.us/j/PENDIENTE"
  duracionMinutos Int                 @default(60)
  activo          Boolean             @default(true)
  horarios        HorarioClase[]
}

model HorarioClase {
  id           Int              @id @default(autoincrement())
  grupoId      Int
  grupo        GrupoClaseEnVivo @relation(fields: [grupoId], references: [id])
  diaSemana    Int              // 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
  horaInicio   String           // "HH:mm" 24h, hora de Guatemala

  @@unique([grupoId, diaSemana, horaInicio])
}
```

And extend the existing Plan model:
```prisma
model Plan {
  // ... existing fields
  incluyeClasesEnVivo Boolean @default(false)
  // ... existing relations
}
```

After editing schema.prisma, run `npx prisma migrate dev --name agregar-clases-en-vivo` to create the migration, then `npx prisma generate` to update the Prisma client.

**Test Strategy:**

After migration: verify the tables exist in the database with `npx prisma studio` or by inspecting the generated migration SQL. Confirm Plan model has the new field and both new models are present with correct field types and constraints.
