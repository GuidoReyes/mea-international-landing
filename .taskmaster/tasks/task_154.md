# Task ID: 154

**Title:** Mark first 3 lessons as free in all 7 rutas

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Create database migration/script to set esGratis=true for first 3 lessons in each ruta

**Details:**

Write idempotent script (backend/src/scripts/mark-free-lessons.ts or SQL migration) to update Leccion.esGratis = true for the first 3 lessons (by orden in RutaLeccion) of all 7 rutas. Query all rutas, for each ruta get first 3 RutaLeccion entries ordered by orden ASC, update corresponding Leccion records. Ensure script can be run multiple times without issues. Include logging to show which lessons were updated. Currently only 5 lessons are marked free across 3 rutas - this expands to 21 total (3×7).

**Test Strategy:**

Run script, verify exactly 3 lessons per ruta are esGratis=true, verify idempotency (run twice, same result), check database directly, test lesson access without login confirms first 3 accessible
