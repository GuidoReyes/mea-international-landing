# Task ID: 125

**Title:** Extend suscripciones library with live class access check

**Status:** done

**Dependencies:** 121 ✓

**Priority:** high

**Description:** Add tieneSuscripcionConClasesEnVivo function to backend/src/lib/suscripciones.ts without modifying existing tieneSuscripcionActiva

**Details:**

Extend `backend/src/lib/suscripciones.ts` by adding a new function that checks if an alumno has an active subscription WITH live class access.

```typescript
// Add to existing file (do NOT modify tieneSuscripcionActiva)

// Check if alumno has active subscription with live class feature
export async function tieneSuscripcionConClasesEnVivo(alumnoId: number): Promise<boolean> {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: {
      alumnoId,
      estado: "ACTIVA",
      OR: [{ fechaFin: null }, { fechaFin: { gt: new Date() } }],
    },
    include: {
      planPrecio: {
        include: {
          plan: {
            select: { incluyeClasesEnVivo: true }
          }
        }
      }
    }
  });
  
  return suscripcion?.planPrecio.plan.incluyeClasesEnVivo === true;
}
```

This extends the existing check to also verify the plan includes live classes. Keep the original `tieneSuscripcionActiva` function unchanged as it's used throughout the codebase for unlocking lessons.

**Test Strategy:**

After implementing the routes (task 126), test with: (1) Alumno with Plan Profesional ACTIVA → should return true, (2) Alumno with Plan Esencial ACTIVA → should return false (no live classes), (3) Alumno without subscription → should return false. Verify existing lesson unlock logic still works (uses tieneSuscripcionActiva).
