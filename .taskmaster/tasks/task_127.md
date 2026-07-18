# Task ID: 127

**Title:** Create gated Zoom entry endpoint with rate limiting

**Status:** done

**Dependencies:** 125 ✓, 126 ✓

**Priority:** high

**Description:** Implement GET /api/clases-en-vivo/:grupoId/entrar with alumno JWT verification, subscription check, and rate limiting

**Details:**

Add the gated entry endpoint to `backend/src/routes/clases-en-vivo.ts`:

```typescript
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { tieneSuscripcionConClasesEnVivo } from "../lib/suscripciones";
import { log } from "../lib/logger";
import redisClient from "../lib/redis";

// Rate limiting: max 10 entry attempts per alumno per hour
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX = 10;

router.get("/:grupoId/entrar", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const grupoId = parseInt(req.params["grupoId"] as string);
  const alumnoId = req.alumno!.alumnoId;
  
  if (isNaN(grupoId)) {
    res.status(400).json({ error: "ID de grupo inválido" });
    return;
  }
  
  // Rate limiting (same pattern as checkoutAttempts in routes/suscripciones.ts)
  const rateLimitKey = `live_class_entry:${alumnoId}`;
  try {
    const attempts = await redisClient.incr(rateLimitKey);
    if (attempts === 1) await redisClient.expire(rateLimitKey, RATE_LIMIT_WINDOW);
    if (attempts > RATE_LIMIT_MAX) {
      res.status(429).json({ error: "Demasiados intentos. Intentá de nuevo en una hora." });
      return;
    }
  } catch {
    // Redis unavailable, allow request (fail open for availability)
  }
  
  // Check subscription with live class access
  const tieneAcceso = await tieneSuscripcionConClasesEnVivo(alumnoId);
  if (!tieneAcceso) {
    res.status(403).json({ reason: "plan_required", error: "Necesitás un plan con clases en vivo" });
    return;
  }
  
  // Fetch group with schedules
  const grupo = await prisma.grupoClaseEnVivo.findUnique({
    where: { id: grupoId },
    include: { horarios: true }
  });
  
  if (!grupo || !grupo.activo) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }
  
  // Check if class is live OR starts in next 10 minutes
  const ahora = obtenerAhoraGuatemala();
  const MIN_ANTICIPACION = 10; // minutes before class start
  
  let puedeEntrar = false;
  let nextOccurrence: { diaSemana: number; horaInicio: string } | null = null;
  
  for (const horario of grupo.horarios) {
    if (estaEnVivo(horario, grupo.duracionMinutos, ahora)) {
      puedeEntrar = true;
      break;
    }
    
    // Check if starts in next 10 minutes
    if (horario.diaSemana === ahora.diaSemana) {
      const [h, m] = horario.horaInicio.split(':').map(Number);
      const inicioMin = h * 60 + m;
      const diff = inicioMin - ahora.minutos;
      
      if (diff > 0 && diff <= MIN_ANTICIPACION) {
        puedeEntrar = true;
        break;
      }
    }
  }
  
  if (!puedeEntrar) {
    // Find next occurrence for helpful error message
    const proxima = obtenerProximaClase([grupo], ahora);
    if (proxima) {
      nextOccurrence = { diaSemana: proxima.diaSemana, horaInicio: proxima.horaInicio };
    }
    
    res.status(409).json({ 
      reason: "not_live", 
      error: "Esta clase no está en vivo ahora",
      nextOccurrence 
    });
    return;
  }
  
  // Success: log entry and return Zoom URL
  log("info", `[ClasesEnVivo] Alumno ${alumnoId} entró a grupo ${grupoId} (${grupo.nombre})`);
  
  res.json({ zoomUrl: grupo.urlZoom });
});
```

This endpoint handles all gating logic: JWT verification, subscription check with live class feature, rate limiting, and time-based access control (only when class is live or starts in 10 minutes).

**Test Strategy:**

Test scenarios: (1) Alumno with Profesional plan + class live → returns {zoomUrl}, (2) Alumno with Esencial plan → 403 with reason:plan_required, (3) No JWT token → 401, (4) Class not live and not starting soon → 409 with reason:not_live and nextOccurrence, (5) Class starting in 5 minutes → returns {zoomUrl}, (6) 11th request in same hour → 429 rate limit error.
