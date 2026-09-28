# PRD: Remediación ronda 2 — hallazgos del re-scan fuera del alcance original

## 1. Contexto

El 2026-09-22 se ejecutó un re-scan real de verificación (`scan_id 6ef109d5-ecef-4560-ad4d-238858e26e16`, 131 archivos, contra `fix/security-remediation`) como cierre de la ronda 1 (`.taskmaster/docs/security-remediation-prd.md`, tareas #474-#487). Ese re-scan encontró **56 hallazgos**, de los cuales:

- 3 ya se resolvieron o descartaron en la propia verificación: `vuln_047` (secreto JWT hardcodeado en un archivo de prueba, corregido), `vuln_038` (assets del login públicos por necesidad arquitectónica, riesgo bajo, no es regresión) y `vuln_055` (**alucinación confirmada del scanner** — el código citado no existe en el archivo real, verificado con `grep`).
- **53 quedan pendientes**: 12 HIGH, 27 MEDIUM y 14 LOW. Este PRD cubre esos 53.

Ninguno de estos 53 es una regresión del trabajo de la ronda 1 — están en código que ninguna tarea 474-486 tocó (excepto `vuln_010`, que ya estaba documentado como *Accepted Risk* en la ronda 1 y se retoma aquí para resolverlo del todo, y `vuln_041`/`vuln_042`/`vuln_043`, en un script — `crear-alumnos-grupo.ts` — donde la ronda 1 solo arregló los permisos del CSV, sin tocar el resto del archivo).

Igual que en la ronda 1: **los hallazgos los generó una IA y pueden contener falsos positivos.** Ya se confirmó al menos un caso (`vuln_055`) donde el `code_snippet` citado no coincidía con el archivo real. Toda tarea empieza verificando contra el código actual antes de tocar nada.

## 2. Objetivos y criterios de éxito

1. Los 11 HIGH de este documento quedan en **Fixed**, **False Positive** (con evidencia) o **Accepted Risk** (con justificación) — igual que 0 CRITICAL/HIGH abiertos sin decisión explícita.
2. Los 29 MEDIUM y 13 LOW quedan igual documentados; se priorizan por severidad, pero no es obligatorio cerrarlos todos en la primera pasada.
3. Un re-scan final con los 53 IDs de este documento con disposición conocida.
4. Sin regresiones: `npx tsc --noEmit` en `backend/` y en la raíz con 0 errores; las 14 suites de la ronda 1 siguen en verde.

## 3. Reglas de ejecución (idénticas a la ronda 1 — no repetir errores ya identificados)

1. **Verificar primero contra el archivo real**, no contra el `code_snippet` citado por el scan — ya hubo una alucinación confirmada en el re-scan.
2. **Prueba primero (RED → GREEN).** Mismo patrón: `backend/src/scripts/test-*.ts`, ejecutados con `node -r ts-node/register/transpile-only <archivo>`. **Todo archivo de prueba nuevo debe generar su secreto con `crypto.randomBytes`, nunca un literal** — la ronda 1 tuvo dos descuidos exactos de este tipo (`vuln_050` en la primera pasada, `vuln_047` encontrado en la verificación final) y el re-scan ya encontró un tercero relacionado (`vuln_048`, el firmante por defecto de `test-access-control.ts` — verificar que quedó bien corregido, no solo el `process.env.JWT_SECRET`).
3. **Compilar** (`backend` y raíz) con 0 errores antes de marcar cualquier tarea como hecha.
4. **Reutilizar los helpers de la ronda 1 en vez de duplicar lógica** (regla DRY): `safeEqual` (`lib/safe-equal.ts`), `sanitizeForLog`/`maskPhone` (`lib/log-sanitize.ts`), `generateSecurePassword` (`lib/crypto-utils.ts`), `createWithUniqueRetry` (`lib/retry-on-conflict.ts`), `isTrustedR2Url` (`lib/r2-url.ts`), `parseDateFilter` (`lib/date-utils.ts`), los limitadores de `middleware/rate-limit.middleware.ts`, `errorHandler` (`middleware/error.middleware.ts`). Varios de los 53 hallazgos de este documento se resuelven aplicando un helper que YA EXISTE, no escribiendo uno nuevo.
5. **No romper contratos públicos.** Antes de agregar una restricción de autorización a una ruta admin, buscar quién la consume en el frontend (`app/admin/**`).
6. **Prisma.** Solo migraciones aditivas con `migrate dev`. Recordar: la ronda 1 dejó **bloqueado** cualquier `migrate dev` por una migración preexistente rota (`20260513120000_add_auditoria_admin`, ver `schema.prisma` en el modelo `Inscripcion`). Si alguna tarea de este documento necesita una migración de verdad, coordinar con ese bloqueo antes de intentarlo — no repetir el mismo intento fallido sin resolverlo primero.
7. **Secretos.** Nunca en código, logs, commits ni en este PRD.
8. **Un commit por tarea**, formato `fix(security): <descripcion> (ronda 2)`.

## 4. Decisiones de diseño

### D1. `vuln_010` (continuación de la ronda 1): apagar `LEGACY_TOKEN_IN_BODY`

La ronda 1 dejó la bandera en `true` por defecto porque no se pudo confirmar el estado del frontend en producción desde esta sesión. El re-scan repite el hallazgo con más fuerza ("remove entirely"). **Esta tarea requiere que el dueño del proyecto confirme que el build de Vercel actual ya no lee el campo `token` del login** (se puede verificar con el Network tab del navegador en `https://mea.edu.gt/admin` tras un login) antes de poner `LEGACY_TOKEN_IN_BODY=false` en Railway y, en un commit posterior, borrar la bandera y el campo del código.

### D2. Cluster de IDOR en rutas admin (7 HIGH)

`certificados.ts` (x2), `certificados-online.ts`, `crm.ts`, `cuotas.ts`, `pagos.ts` (GET), `reportes-leccion.ts`, `suscripciones.ts` (ya semi-cubierto: el comprobante de depósito ya tiene ownership por `alumnoId`, revisar si el hallazgo es sobre otro campo). Todos comparten el mismo patrón estructural que ya se resolvió en la ronda 1 para `inscripciones.ts`/`ediciones.ts` (tarea #482): falta `requireRole` o un filtro por `adminId`/`alumnoId` del token. **No inventar un mecanismo nuevo** — replicar `requireRole`/`verifyJWT` tal como se usa en `reportes.ts` (`requireRole("SUPER_ADMIN")`, ya existente) y en las rutas ya corregidas.

### D3. Email del agente de seguridad (`emailer.ts`)

Nunca se revisó en la ronda 1 (el scope original se centró en `dashboard/app.js`, `storage.ts`, `scanner.ts`, `analyzer.ts`, `middleware.ts`). Necesita su propio `escHtml()` — HTML-escaping simple (`&<>"'`), distinto del `esc()` de `app.js` (que corre en el navegador); este es server-side, en un archivo `.ts`.

## 5. Paquetes de trabajo

### T1. IDOR en rutas de administración (prioridad ALTA — 8 HIGH)
- **Hallazgos:** `vuln_016` (`certificados-online.ts:47`), `vuln_018` (`certificados.ts:22`), `vuln_019` (`certificados.ts:80`), `vuln_022` (`crm.ts:94`), `vuln_026` (`cuotas.ts:55`), `vuln_032` (`pagos.ts:17`), `vuln_033` (`reportes-leccion.ts:16`), `vuln_036` (`suscripciones.ts:168`).
- **Hacer:** ver D2. Para cada ruta: verificar primero si el hallazgo es real (leer el código actual), decidir si el control correcto es "solo admin" (`requireRole`) o "solo el dueño del recurso" (filtro por id), y aplicarlo. `vuln_016`: evaluar si `urlPdf` debe requerir sesión o si los códigos de certificado ya son suficientemente aleatorios (revisar el modelo `Certificado` antes de decidir).
- **Aceptación:** una prueba por ruta (usuario sin permiso → 403/404; usuario correcto → 200).

### T2. XSS en el email del agente de seguridad (prioridad ALTA — 2 HIGH/MEDIUM)
- **Hallazgos:** `vuln_053` (HIGH, `emailer.ts:29`), `vuln_054` (MEDIUM, `emailer.ts:45`).
- **Hacer:** `escHtml()` nuevo en `security-agent/emailer.ts` (o en `lib/`, si se reutiliza en otro lado), aplicado a `title`, `file`, `severity`, `scan_summary` y cualquier otro campo generado por la IA que se interpole en `buildHtml`.
- **Aceptación:** payload `<img src=x onerror=...>` en un campo simulado se renderiza como texto en el HTML generado.

### T3. Endurecer `/api/test-bot` (prioridad ALTA — 1 HIGH + 2 MEDIUM)
- **Hallazgos:** `vuln_002` (HIGH, `index.ts:113`), `vuln_004` (MEDIUM, `index.ts:130`), `vuln_005` (MEDIUM, `index.ts:120`).
- **Hacer:** decidir si `ENABLE_TEST_ENDPOINT` se elimina del todo (ya está protegido por `securityKeyMiddleware`, así que el riesgo real es medio-bajo, pero simplificar es barato) o se deja con un allowlist de teléfonos; validar `telefono`/`mensaje` con Zod; usar `errorHandler`/`log()` en vez de `res.json({error: String(err)})`.
- **Aceptación:** con `NODE_ENV=production` y sin la bandera, la ruta no se monta; input inválido da 400.

### T4. MS Graph / `services/notifications.ts` (prioridad MEDIA — 2 MEDIUM, área nunca revisada)
- **Hallazgos:** `vuln_051` (`notifications.ts:34`), `vuln_052` (`notifications.ts:72`).
- **Hacer:** validar `MS_TENANT_ID`/`MS_CLIENT_ID` contra un patrón UUID antes de interpolarlos en la URL del token; truncar y sanear la respuesta de error antes de loguearla (reusar `sanitizeForLog`).
- **Aceptación:** un tenant ID con formato inválido falla rápido con un mensaje claro.

### T5. `crear-alumnos-grupo.ts`, segunda pasada (prioridad MEDIA — 1 HIGH + 3 MEDIUM)
- **Hallazgos:** `vuln_040` (HIGH, contraseñas en CSV — *Accepted Risk* en la ronda 1, se retoma aquí), `vuln_041` (contraseña débil), `vuln_042` (carnet no atómico), `vuln_043` (path traversal en `ROSTER_FILE`).
- **Hacer:** **reutilizar, no reinventar** — `vuln_041` se resuelve con `generateSecurePassword` (ya existe, usado en `alumnos.ts` desde la tarea #483); `vuln_042` con `createWithUniqueRetry` (ya existe, tarea #485); `vuln_043` con una validación de que `ROSTER_FILE` resuelve dentro de un directorio permitido (patrón similar a `resolveScanPaths` de `security-agent/scanner.ts`, tarea #479). `vuln_040` ya tiene permisos 0600 (ronda 1); el punto pendiente es si el CSV con contraseñas en texto plano debe seguir escribiéndose a disco o migrar a stdout/un canal cifrado — **es una decisión de flujo operativo, no un fix de una línea; requiere que el dueño del proyecto decida antes de tocar el comportamiento del script.**
- **Aceptación:** mismas pruebas que ya existen para esos helpers, aplicadas a este script.

### T6. Validación de entradas, segunda pasada (prioridad MEDIA — 5 MEDIUM)
- **Hallazgos:** `vuln_021` (`clases-en-vivo.ts:228`, horario), `vuln_023` (`finanzas.ts:36`, categoria), `vuln_025` (`inscripciones.ts:178`, CSV sin soporte de comillas), `vuln_027` (`cursos.ts:52`, mass assignment), `vuln_034` (`pagos.ts:34`, filtros sin validar).
- **Hacer:** mismo patrón Zod de la tarea #484. `vuln_025` es más grande: reemplazar el `split(',')` manual por una librería real (`csv-parse` o `papaparse`) en las dos rutas de importación CSV de `inscripciones.ts` — evaluar impacto en el parseo ya existente antes de cambiarlo.
- **Aceptación:** una prueba por caso con datos que rompían el parseo/filtro anterior.

### T7. Rate limiting, segunda pasada (prioridad MEDIA — 2 MEDIUM)
- **Hallazgos:** `vuln_020` (`certificados.ts:89`, verificación pública), `vuln_035` (`reportes.ts:37`, endpoints financieros).
- **Hacer:** reusar `createLimiter`/`ResilientStore` de `lib/rate-limit-store.ts` (tarea #475), no crear un mecanismo nuevo.
- **Aceptación:** superar el límite da 429.

### T8. JARVIS bridge, segunda pasada (prioridad MEDIA — 1 MEDIUM + 1 LOW)
- **Hallazgos:** `vuln_030` (`jarvis-bridge.ts:24`, token vacío pasa la comprobación), `vuln_031` (`jarvis-bridge.ts:103`, contenido de conversación sin filtrar).
- **Hacer:** `vuln_030` — validar que `JARVIS_BRIDGE_TOKEN` tenga al menos 32 caracteres al arrancar. `vuln_031` — decisión de producto más que de código: documentar que es intencional (JARVIS necesita el contenido para resumir) o agregar un filtro de patrones sensibles (tarjetas, PINs) antes de enviar.
- **Aceptación:** con un token corto, el servidor rechaza arrancar o loguea una advertencia clara.

### T9. Logging y enmascarado, segunda pasada (prioridad MEDIA — 5 hallazgos)
- **Hallazgos:** `vuln_001` (`claude.ts:112`, teléfono completo en notificación), `vuln_037` (`whatsapp.webhook.ts:172`), `vuln_009` (`logger.ts:9`, nivel info suprimido en prod), `vuln_017` (`auth-alumno.ts:263`, OTP en log de fallo), `vuln_050` (`seed-cursos-online.ts:208`).
- **Hacer:** aplicar `maskPhone`/`sanitizeForLog` (ya existen, tarea #476) donde falte. `vuln_009` es una decisión de diseño (¿introducir `LOG_LEVEL`? ¿subir eventos de seguridad a `warn`?) más que un fix mecánico.
- **Aceptación:** ningún log de estas rutas expone un teléfono completo o un código OTP.

### T10. Endurecimiento menor del agente de seguridad (prioridad BAJA — 2 hallazgos)
- **Hallazgos:** `vuln_039` (`security.routes.ts:47`, `scanStates` sin límite de memoria), `vuln_056` (`session.ts:48`, cookie sin `Secure` fuera de producción).
- **Hacer:** LRU o TTL sobre el `Map` de `scanStates`; revisar si `vuln_056` es un problema real — la cookie de sesión ya usa `secure: NODE_ENV === "production"` a propósito, que es el patrón estándar (HTTPS no está disponible en `localhost` en desarrollo). Verificar antes de "corregir" — puede ser otro caso a marcar como *False Positive* con justificación.
- **Aceptación:** un scan con miles de IDs no crece memoria sin límite.

### T11. Scripts: SSRF y sanitización, segunda pasada (prioridad BAJA — 3 hallazgos)
- **Hallazgos:** `vuln_044` (`generar-audio-faltante.ts:93`, SSRF — mismo patrón que `generate-leccion.ts`), `vuln_045` (`generate-leccion.ts:348`, contenido de IA sin sanear), `vuln_046` (`generate-leccion.ts:196`, recordatorio de validar la API key).
- **Hacer:** `vuln_044` se resuelve importando `isTrustedR2Url` (ya existe, tarea #486) en `generar-audio-faltante.ts`. `vuln_045` — verificar primero si aplica el mismo análisis que `vuln_048` de la ronda 1 (el frontend no usa `dangerouslySetInnerHTML` para lecciones); si es así, es otro falso positivo, documentarlo en vez de sanear sin necesidad. `vuln_046` — usar `validateAnthropicApiKey` (ya existe) en el punto exacto que cita el hallazgo.
- **Aceptación:** `test-script-security.ts` extendido con el caso de `generar-audio-faltante.ts`.

### T12. `vuln_010`: apagar el token en el body (prioridad ALTA, requiere confirmación externa)
- Ver D1. **No ejecutar el cambio de `LEGACY_TOKEN_IN_BODY` sin que el dueño del proyecto confirme el estado del frontend en producción.**

### T13. Limpieza de bajo riesgo, agrupada (prioridad BAJA — resto de LOW)
- **Hallazgos:** `vuln_003` (`advisor-commands.ts:28`), `vuln_006` (`claude.ts:22`, historial sin cifrar en Redis), `vuln_007` (`claude.ts:101`, `create` sin `await`), `vuln_008` (`index.ts:55`, CORS con localhost en todo entorno), `vuln_011` (`error.middleware.ts:42`, ya es el diseño intencional de la tarea #484 — verificar si es un falso positivo antes de tocar), `vuln_012` (`notion-context.ts:6`), `vuln_013` (`rate-limit.middleware.ts:38`, INCR+EXPIRE no atómico), `vuln_014` (`piper-tts.ts:37`), `vuln_015` (`notion-context.ts:57`), `vuln_024` (`finanzas.ts:42`), `vuln_028` (`certificados.ts:15`), `vuln_029` (`marketing.ts:84`), `vuln_049` (`seed-curriculum-500.ts:160`).
- **Hacer:** revisar cada uno individualmente (son heterogéneos); varios son de minutos. `vuln_011` probablemente es un falso positivo — `errorHandler` ya condiciona el stack a `NODE_ENV !== "production"` a propósito (mismo patrón que el resto del proyecto); confirmar antes de "corregirlo".
- **Aceptación:** una prueba o verificación por hallazgo, documentado igual que el resto.

### T14. Verificación final y segundo re-scan (prioridad ALTA; depende de T1-T13)
- **Hacer:** compilar, correr todas las pruebas (las 14 de la ronda 1 + las nuevas), y un segundo re-scan real **solo con autorización explícita** (cuesta dinero). Comparar contra el re-scan de la ronda 1 (score 69, 56 hallazgos) y actualizar `.taskmaster/docs/security-remediation-report.md` con una tabla de estos 53 IDs.
- **Aceptación:** 0 HIGH abiertos sin disposición documentada.

## 6. Orden de ejecución

1. **T1 y T2 primero** (todos los HIGH de mayor impacto real: IDOR y XSS en email).
2. **T3** puede ir en paralelo (archivo distinto, `index.ts`).
3. **T5, T6, T7, T11** reutilizan helpers ya existentes — bajo riesgo, se pueden paralelizar entre sí si se asignan a archivos distintos.
4. **T4, T8, T9, T10, T13** son áreas más aisladas, en cualquier orden.
5. **T12** depende de una respuesta externa (no de código) — puede ir en cualquier momento una vez que el dueño del proyecto confirme.
6. **T14 al final**, con autorización explícita para el segundo re-scan.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Falsos positivos del scanner (ya hubo uno confirmado: `vuln_055`) | Regla 1: verificar contra el código real, no contra el `code_snippet` citado |
| Proteger rutas admin rompe el panel (T1) | Regla 5: buscar consumidores en `app/admin/**` antes de agregar `requireRole` |
| Repetir el descuido de un secreto hardcodeado en una prueba nueva | Regla 2, explícita esta vez por haber pasado dos veces en la ronda 1 |
| Migración de BD bloqueada (si alguna tarea la necesitara) | Regla 6: no reintentar sin resolver `add_auditoria_admin` primero |

## 8. Fuera de alcance

- Resolver la migración rota de `add_auditoria_admin` (bloqueaba `vuln_025` de la ronda 1) — es un problema de infraestructura aparte, no de este PRD.
- Cualquier hallazgo nuevo que aparezca en el segundo re-scan (T14) — se documenta para una ronda 3, no se mezcla aquí.
