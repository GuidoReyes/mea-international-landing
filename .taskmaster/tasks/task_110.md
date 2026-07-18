# Task ID: 110

**Title:** Extend Prisma schema with Ruta and RutaLeccion models

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Add Ruta and RutaLeccion models to schema.prisma and update Capitulo with nivel field

**Details:**

1. Add `Ruta` model with Int @id @default(autoincrement()), slug (unique), titulo, descripcion, nivelMinimo, nivelMaximo, icono (nullable), orden (default 0), publicada (default false), proximamente (default false)
2. Add `RutaLeccion` M2M pivot with composite PK [rutaId, leccionId], orden field, proper indexes
3. Add `nivel String` field to Capitulo model with default "A1" for migration safety
4. Add inverse relation `rutas RutaLeccion[]` to existing Leccion model
5. Run `npx prisma migrate dev --name add-rutas-curriculum` to generate migration
6. Verify migration runs without breaking existing InscripcionOnline, ProgresoLeccion, CertificadoOnline tables
7. Use Int PKs throughout (NOT cuid), consistent with existing schema

**Test Strategy:**

1. Verify migration applies cleanly against existing DB
2. Check that all existing foreign key relationships remain intact
3. Confirm Capitulo rows get nivel="A1" default
4. Test that InscripcionOnline/ProgresoLeccion queries still work
5. Verify composite PK constraint on RutaLeccion prevents duplicates
