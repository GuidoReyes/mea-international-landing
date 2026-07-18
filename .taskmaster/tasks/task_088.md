# Task ID: 88

**Title:** Crear endpoint GET /api/suscripciones/me para consultar estado de suscripción

**Status:** done

**Dependencies:** 84 ✓

**Priority:** medium

**Description:** Endpoint para que el alumno consulte su suscripción actual (plan, fechas, estado)

**Details:**

Crear en `backend/src/routes/suscripciones.ts` (archivo nuevo):

`GET /api/suscripciones/me` (auth alumno requerido):
1. Buscar la suscripción más reciente del alumno:
   - `orderBy: { creadoEn: 'desc' }`, `take: 1`
   - Include: `planPrecio.plan`
2. Si no existe, responder: `{ activa: false, suscripcion: null }`
3. Si existe, calcular:
   - `activa`: estado=ACTIVA Y fechaFin > now
   - `diasRestantes`: diferencia entre fechaFin y now en días (usar date-fns)
   - `vencida`: fechaFin < now
4. Responder:
```json
{
  "activa": boolean,
  "suscripcion": {
    "id": number,
    "plan": { "nombre": string, "slug": string },
    "estado": string,
    "fechaInicio": date,
    "fechaFin": date,
    "diasRestantes": number,
    "proveedor": string
  }
}
```

Registrar router en `backend/src/index.ts`.

Tecnologías: Express, Prisma, date-fns

**Test Strategy:**

Integration tests:
- Alumno sin suscripción recibe activa=false
- Alumno con suscripción ACTIVA vigente recibe activa=true
- Alumno con suscripción VENCIDA recibe activa=false
- diasRestantes calculado correctamente
- Request sin auth retorna 401
