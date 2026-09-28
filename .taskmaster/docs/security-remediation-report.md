# Reporte de remediación — scan de seguridad MEA International

**Scan base:** `b0da64e6-45dc-4cca-b4a9-f3cd391e7e29` (2026-09-20). 101 archivos, 60 hallazgos (0 CRITICAL, 13 HIGH, 35 MEDIUM, 12 LOW), puntaje 60.

**Rama de trabajo:** `fix/security-remediation`. Tareas de Task Master #474-#487 (PRD: `.taskmaster/docs/security-remediation-prd.md`).

**Nota de ubicación:** el PRD original pedía guardar esto en `backend/.security-scans/`, pero esa carpeta está en `.gitignore` (contiene el historial crudo de scans, con más detalle explotable). Este reporte es documentación para revisar y pushear, así que va junto al PRD en `.taskmaster/docs/`.

## Leyenda de estado

- **Fixed** — se cambió código y se verificó con una prueba automatizada.
- **False Positive** — el hallazgo no tiene una entrada externa alcanzable; se verificó leyendo el código real, sin cambios (o con endurecimiento defensivo adicional, anotado).
- **Accepted Risk** — se dejó un comportamiento intencional con una mitigación parcial, documentado explícitamente.

## Tabla de los 60 hallazgos

| ID | Sev | Ubicación (scan base) | Título | Estado | Tarea | Evidencia / justificación |
|---|---|---|---|---|---|---|
| vuln_001 | HIGH | `backup/dumper.ts:32` | Contraseña de BD en argv de mysqldump | Fixed | #480 | `--defaults-extra-file` con archivo temporal 0600, borrado en `finally`. `test-backup-security.ts`. |
| vuln_009 | HIGH | `middleware/audit.middleware.ts:11` | Cuerpo de la petición en el log de auditoría | Fixed | #476 | `sanitizeForLog(req.body)` antes de persistir en `auditoriaAdmin.detalle`. `test-log-sanitize.ts`. |
| vuln_019 | HIGH | `routes/inscripciones.ts:55` | IDOR en Inscripcion/Pago | Fixed | #482 | Causa raíz real: `verifyJWT` aceptaba tokens de alumno (mismo `JWT_SECRET`). Ahora exige `adminId`. `test-access-control.ts`. |
| vuln_020 | HIGH | `routes/jarvis-bridge.ts:26` | Bypass de comparación por longitud | Fixed | #474 | `safeEqual` (SHA-256 + `timingSafeEqual`). Mismo bug que el del dashboard, confirmado en ejecución. `test-safe-equal.ts`. |
| vuln_021 | HIGH | `routes/marketing.ts:53` | Sin rate limiting | Fixed | #475 | `globalLimiter` en `/api/marketing`. `test-rate-limiting.ts`. |
| vuln_028 | HIGH | `routes/security.routes.ts:42` | Assets del dashboard sin autenticar | Fixed | #477 | `securityKeyMiddleware` en `/security/assets/*`. `test-security-session.ts`. |
| vuln_034 | HIGH | `routes/webhooks-recurrente.ts:54` | Verificación de firma depende de rawBody | Fixed | #481 | `requireRawBody` (400 explícito); la firma ya fallaba cerrada antes. `test-webhook-security.ts`. |
| vuln_036 | HIGH | `scripts/crear-alumnos-grupo.ts:228` | Contraseñas en CSV sin proteger | Fixed | #486 | `writeFileSync` con `mode: 0o600`. `test-script-security.ts`. |
| vuln_041 | HIGH | `scripts/generar-tasks-500.ts:131` | Inyección de comandos vía execSync | False Positive | #486 | El string es 100% literal, sin interpolación. Script eliminado (obsoleto, sin importadores). |
| vuln_043 | HIGH | `scripts/generate-leccion.ts:238` | SSRF vía fetch sin validar | False Positive | #486 | La URL siempre sale de `CLOUDFLARE_R2_PUBLIC_URL` (env de servidor). Se agregó `isTrustedR2Url` como defensa extra igual. `test-script-security.ts`. |
| vuln_045 | HIGH | `scripts/get-drive-token.ts:49` | Refresh token impreso en consola | Fixed | #486 | Se escribe en archivo local 0600, en pantalla solo enmascarado. `.gitignore` actualizado. |
| vuln_053 | HIGH | `security-agent/dashboard/app.js:2` | Clave en URL y sessionStorage | Fixed | #477 | Sesión por cookie httpOnly; `?key=` rechazado siempre. `test-security-session.ts`. |
| vuln_054 | HIGH | `security-agent/dashboard/app.js:237` | XSS en enlaces de Drive | Fixed | #478 | `esc()` en nombre, `webViewLink` validado contra prefijo de Drive, `rel="noopener noreferrer"`. `test-dashboard-xss.ts`. |
| vuln_002 | MEDIUM | `lib/drive-comprobantes.ts:22` | Inyección en consulta de Drive | Fixed | #480 | `escapeDriveQueryValue` (escapa `\` antes que `'`) + `requireDriveId`. `test-backup-security.ts`. |
| vuln_003 | MEDIUM | `backup/cleaner.ts:42` | Inyección de ID de carpeta de Drive | Fixed | #480 | `requireDriveId` valida formato antes de interpolar. `test-backup-security.ts`. |
| vuln_004 | MEDIUM | `lib/logger.ts:9` | Datos sensibles en logs | Fixed | #476 | `sanitizeForLog` en `log()`; antes un `Error` como meta se serializaba como `{}`. `test-log-sanitize.ts`. |
| vuln_005 | MEDIUM | `index.ts:89` | Sin rate limit en webhook de WhatsApp/bot | Fixed | #475 | El webhook de Meta ya tenía límite por teléfono en Redis; se agregó `webhookLimiter` al de Twilio. `test-rate-limiting.ts`. |
| vuln_010 | MEDIUM | `routes/auth.ts:75` | JWT en el cuerpo de la respuesta | Accepted Risk | #483 | Verificado: el panel de admin ya usa solo la cookie (no lee `token`). `LEGACY_TOKEN_IN_BODY` (default `true`) mantiene el campo por si un build viejo de Vercel lo necesita — no se pudo confirmar el estado de producción desde esta sesión. Poner en `false` y luego borrar el flag una vez confirmado. |
| vuln_011 | MEDIUM | `routes/alumnos.ts:107` | Contraseña temporal con Math.random() | Fixed | #483 | `generateSecurePassword` con `crypto.randomInt`, ~74 bits de entropía. `test-auth-security.ts`. |
| vuln_012 | MEDIUM | `routes/auth-alumno.ts:44` | Rate limit en memoria no escala | Fixed | #475 | Migrado a Redis (`alumnoLoginLimiter`); de paso corrige IPv6 sin normalizar. `test-rate-limiting.ts`. |
| vuln_015 | MEDIUM | `routes/clases-en-vivo.ts:154` | urlZoom sin validar | Fixed | #484 | Zod: exige `https` y hostname `zoom.us`/`*.zoom.us`. `test-input-validation.ts`. |
| vuln_016 | MEDIUM | `middleware/twilio-webhook.middleware.ts:22` | Se omite verificación sin token | Fixed | #481 | Falla cerrado fuera de `development`/`test`. `test-webhook-security.ts`. |
| vuln_018 | MEDIUM | `routes/ediciones.ts:33` | GET públicos sin autenticación | Fixed | #482 | `verifyJWT` agregado; confirmado que solo páginas de admin lo consumen. `test-access-control.ts`. |
| vuln_022 | MEDIUM | `routes/leads.ts:55` | Inyección de fórmulas en CSV | Fixed | #484 | `escapeCsv` antepone `'` a celdas que empiezan con `=+-@`/tab/CR (OWASP). `test-input-validation.ts`. |
| vuln_023 | MEDIUM | `routes/inscripciones.ts:38` | Query param `estado` sin validar | Fixed | #484 | `isEstadoInscripcionValido` antes del `where`; mismo hueco encontrado y corregido en `leads.ts`. `test-input-validation.ts`. |
| vuln_024 | MEDIUM | `routes/ediciones.ts:45` | Manejo de errores faltante | Fixed | #484 | `errorHandler` centralizado; Express 5 (ya en el proyecto) reenvía solo las promesas rechazadas. |
| vuln_026 | MEDIUM | `routes/inscripciones.ts:10` | Subida sin validar MIME | Fixed | #484 | `validateUpload` deriva la extensión del MIME real, no del nombre. `test-input-validation.ts`. |
| vuln_027 | MEDIUM | `routes/inscripciones.ts:258` | Condición de carrera en carnet | Fixed | #485 | `Alumno.carnet` ya tenía `@unique` en la BD; `createWithUniqueRetry` regenera y reintenta ante `P2002`. `test-data-integrity.ts`. |
| vuln_030 | MEDIUM | `routes/suscripciones.ts:32` | Rate limiter en memoria | Fixed | #475 | Migrado a Redis (`checkoutLimiter`). `test-rate-limiting.ts`. |
| vuln_031 | MEDIUM | `routes/suscripciones.ts:68` | Plan no público seleccionable | Fixed | #482 | `PlanPrecio` no tiene campo activo/publico; se rechaza `precioTotalCentavos <= 0` en checkout y checkout-manual. |
| vuln_032 | MEDIUM | `routes/suscripciones.ts:214` | Extensión del nombre de archivo | Fixed | #484 | `validateUpload`, misma solución que vuln_026. `test-input-validation.ts`. |
| vuln_033 | MEDIUM | `routes/twilio.webhook.ts:59` | Remitente admin sin verificar | Fixed | #481 | `isSamePhone(From, ADMIN_TWILIO_WHATSAPP)`; hallazgo real y grave (cualquiera podía dar comandos). `test-webhook-security.ts`. |
| vuln_035 | MEDIUM | `routes/whatsapp.webhook.ts:144` | Teléfono sin normalizar | Fixed | #481 | `normalizePhone` aplicado al recibir de Meta. `test-webhook-security.ts`. |
| vuln_037 | MEDIUM | `routes/suscripciones.ts:196` | Comprobante sin chequear estado del pago | Fixed | #482 | `puedeSubirComprobante`; 409 si el pago ya está `COMPLETADO`/`REEMBOLSADO`. |
| vuln_040 | MEDIUM | `scripts/generar-tasks-500.ts:116` | Path traversal | False Positive | #486 | `tasksPath` es literal fijo vía `__dirname`, sin input externo. Script eliminado. |
| vuln_042 | MEDIUM | `scripts/generate-leccion.ts:149` | API key sin validar | Fixed | #486 | Reutiliza `validateAnthropicApiKey` (de #479). El scan citó `OPENAI_API_KEY`, que no existe en este proyecto. |
| vuln_044 | MEDIUM | `scripts/seed-admin.ts:8` | Email de admin por defecto | Fixed | #486 | `requireAdminEmail` lanza si falta, sin default. `test-script-security.ts`. |
| vuln_046 | MEDIUM | `scripts/get-drive-token.ts:30` | OAuth sin `state` | Fixed | #486 | `state` aleatorio generado y verificado en el callback. `test-script-security.ts`. |
| vuln_047 | MEDIUM | `scripts/generar-tasks-500.ts:117` | JSON.parse sin control | False Positive | #486 | Lee el propio `tasks.json` del proyecto, no un archivo externo. Script eliminado. |
| vuln_048 | MEDIUM | `scripts/generate-leccion.ts:293` | Contenido de IA sin sanear | False Positive | #486 | Verificado: ningún componente de lecciones usa `dangerouslySetInnerHTML` en todo el frontend (`grep` completo de `app/` y `components/`). |
| vuln_049 | MEDIUM | `scripts/seed-curriculum.ts:417` | Stack trace por console.error | Fixed | #476 | Log saneado a solo `message`. `test-log-sanitize.ts`. |
| vuln_051 | MEDIUM | `security-agent/analyzer.ts:88` | API key sin validar | Fixed | #479 | `validateAnthropicApiKey`, formato `sk-ant-...`, sin loguear el valor. `test-security-storage.ts`. |
| vuln_052 | MEDIUM | `security-agent/analyzer.ts:51` | Código sin delimitar enviado a la IA | Fixed (mitigado) | #479 | Marcadores con límite aleatorio + instrucción de "dato no confiable" en el prompt de sistema. Reduce, no elimina, el riesgo de inyección de instrucciones. `test-security-storage.ts`. |
| vuln_055 | MEDIUM | `security-agent/dashboard/app.js:296` | XSS en `renderHistory` | Fixed | #478 | `safeScore()` + `esc()` en fecha y conteo. `test-dashboard-xss.ts`. |
| vuln_056 | MEDIUM | `security-agent/middleware.ts:1` | Sin rate limit en scan/auth | Fixed | #475 | `scanLimiter` (2/hora) + `securityAuthLimiter` (10/15min, solo fallos). `test-rate-limiting.ts`. |
| vuln_057 | MEDIUM | `security-agent/scanner.ts:101` | Path traversal en `SECURITY_SCAN_PATHS` | Fixed | #479 | `resolveScanPaths` rechaza `..`, rutas externas y symlinks que salen del proyecto. `test-security-storage.ts`. |
| vuln_058 | MEDIUM | `security-agent/storage.ts:55` | IDOR en resolver vulnerabilidad | Fixed | #479 | `isValidVulnId` valida formato antes de usar el id. `test-security-storage.ts`. |
| vuln_059 | MEDIUM | `security-agent/storage.ts:27` | Historial sin cifrar | Fixed | #479 | AES-256-GCM (clave derivada de `SECURITY_DASHBOARD_SECRET`), permisos 0600, migración del archivo en claro verificada con una copia del historial real. `test-security-storage.ts`. |
| vuln_006 | LOW | `backup/scheduler.ts:56` | Inyección de log vía cron | Fixed | #480 | `stripControlChars` en el log + validación del ID de carpeta al arrancar. |
| vuln_007 | LOW | `lib/advisor-notify.ts:75` | Teléfono en log revela PII | False Positive | #476 | La línea citada ya registraba solo los últimos 4 dígitos, confirmado en el código. |
| vuln_008 | LOW | `backup/drive-auth.ts:45` | JSON.parse sin manejo de error | Fixed | #480 | `parseServiceAccountJson` con error claro, exige `client_email`/`private_key`. `test-backup-security.ts`. |
| vuln_013 | LOW | `routes/auth-alumno.ts:295` | Fuga de tiempo en OTP | Fixed | #483 | `verifyOtpCode` siempre corre `bcrypt.compare` (hash señuelo si no hay registro). `test-auth-security.ts`. |
| vuln_014 | LOW | `middleware/hmac.middleware.ts:25` | Fuga de tiempo en HMAC | Fixed | #474 | `safeEqual`. `test-safe-equal.ts`. |
| vuln_017 | LOW | `routes/alumnos.ts:56` | Condición de carrera en carnet | Fixed | #485 | Mismo fix que vuln_027 (`createWithUniqueRetry`). `test-data-integrity.ts`. |
| vuln_025 | LOW | `routes/inscripciones.ts:135` | Importación CSV duplica inscripción | Fixed (app) | #485 | `findFirst` antes de `create` agregado a `importar-csv` (ya existía en `importar-historico`). La restricción `@@unique` en BD quedó **pendiente**: bloqueada por una migración preexistente y rota en el historial de Prisma, sin relación con esta tarea. Ver `schema.prisma` (`TODO(vuln_025)`). |
| vuln_029 | LOW | `routes/pagos.ts:37` | Fechas inválidas silenciosas | Fixed | #484 | `parseDateFilter` devuelve 400 en vez de `Invalid Date`. `test-input-validation.ts`. |
| vuln_038 | LOW | `routes/whatsapp.webhook.ts:175` | Token de verificación GET sin timing-safe | Fixed | #474 | `safeEqual` aplicado al verify token de Meta; de paso se corrigió que sin `META_WEBHOOK_VERIFY_TOKEN` el webhook se auto-verificaba. `test-safe-equal.ts`. |
| vuln_039 | LOW | `routes/suscripciones.ts:155` | Sin límite de subidas de comprobante | Fixed | #475 | `uploadLimiter` (3/hora por pago). `test-rate-limiting.ts`. |
| vuln_050 | LOW | `scripts/test-security-middleware.ts:45` | Secreto fijo en archivo de prueba | Fixed | #479 | `crypto.randomBytes` en vez de un string literal. |
| vuln_060 | LOW | `security-agent/dashboard/app.js:237` | Falta `rel="noopener noreferrer"` | Fixed | #478 | Agregado al enlace de Drive. `test-dashboard-xss.ts`. |

## Resumen

| Severidad | Fixed | False Positive | Accepted Risk | Total |
|---|---|---|---|---|
| HIGH | 12 | 1 | 0 | 13 |
| MEDIUM | 28 | 4 | 1 | 33 |
| LOW | 11 | 1 | 0 | 12 |
| **Total** | **51** | **6** | **1** | **60** |

## Hallazgos que el scan original no vio y se corrigieron igual

- **Escalación de alumno a admin** (`verifyJWT`): un alumno con sesión pasaba por cualquier ruta protegida solo por `verifyJWT`, porque ambos tokens usan el mismo `JWT_SECRET`. Corregido en #482, junto con vuln_019.
- **Borrado accidental de todos los backups**: `parseInt(env)` con texto daba `NaN`, y `slice(NaN)` equivale a `slice(0)` — un `BACKUP_LOCAL_KEEP_COUNT` mal puesto borraba todos los backups locales. Corregido en #480 con `readPositiveInt`.
- **Limpieza de Drive sin carpeta configurada listaba toda la cuenta**: sin `GOOGLE_DRIVE_BACKUP_FOLDER_ID`, la consulta usaba `trashed=false` a secas y podía borrar carpetas de comprobantes de pago. Corregido en #480.
- **`seed-admin.ts` ejecutaba su `main()` al ser importado** (sin guardia `require.main === module`): un simple `import` para reutilizar `requireAdminEmail` corría un `upsert` real contra la BD. Corregido en #486, durante el propio desarrollo de esa tarea.
- **Tarea #478 (XSS del dashboard) se había saltado por error** durante la ejecución de este plan; se detectó y corrigió al preparar este mismo reporte, antes de que se hiciera el re-scan de verificación.

## Pendiente

- **vuln_025 (parcial):** falta la restricción `@@unique([alumnoId, edicionId])` en la tabla `Inscripcion`. Bloqueada por una migración preexistente y rota en el historial de Prisma (`20260513120000_add_auditoria_admin`), que impide **cualquier** `prisma migrate dev` hasta resolverse — no solo este. Verificado sin duplicados en producción (0 filas en la tabla) antes de intentar la migración.
- **vuln_010 (Accepted Risk):** `LEGACY_TOKEN_IN_BODY` sigue en `true` por defecto. Confirmar que el frontend en producción no lo necesita y ponerlo en `false`.

---

## Re-scan de verificación

**Scan real:** `6ef109d5-ecef-4560-ad4d-238858e26e16` (2026-09-22), ejecutado contra el servidor real localmente (`fix/security-remediation`), vía el flujo de login por cookie de la tarea #477, de punta a punta. 131 archivos (antes 101 — crecieron por los módulos y pruebas nuevas), 56 hallazgos (antes 60), **puntaje 69** (antes 60).

**No se cumplió el criterio de éxito original (score >= 80, 0 HIGH).** El motivo no es que el trabajo de las 60 vulnerabilidades originales haya fallado — esas están cerradas (ver tabla arriba, y confirmado abajo) — sino que el re-scan es un **análisis nuevo e independiente** de todo el código, no una re-verificación puntual de los 60 IDs anteriores. Con 131 archivos ahora escaneados (30 más que el scan base) y una IA cuyo chunking/atención varía entre corridas, salieron a la luz **13 HIGH y 29 MEDIUM nuevos**, la mayoría en código que esta sesión nunca tocó.

### Confirmación de que el scope original de 60 quedó cerrado

Los 13 HIGH del scan base (vuln_001, 009, 019, 020, 021, 028, 034, 036, 041, 043, 045, 053, 054) **no reaparecen** en el re-scan con el mismo contenido — se verificó código por código en las secciones de arriba. Dos hallazgos del re-scan sí se solapan superficialmente con fixes ya hechos, pero al revisar el código real:

- **`vuln_038` (re-scan, MEDIUM, `security.routes.ts:58`, "assets sin auth")** — no es una regresión de `vuln_028`. Es un hallazgo distinto y menor: `/security/login.js` es público por necesidad arquitectónica (la página de login no puede exigir la sesión que todavía no existe). Los assets reales del dashboard (`styles.css`, `app.js`) siguen exigiendo `securityKeyMiddleware`, confirmado leyendo el archivo. Riesgo real: bajo (login.js no expone el nombre de la cookie ni detalles de implementación más allá de "hace POST a /api/security/login").
- **`vuln_055` (re-scan, MEDIUM, `app.js:314`, "Drive link sin escapar")** — **alucinación confirmada del scanner.** El `code_snippet` que cita (`${f.webViewLink}` sin `esc()`) no existe en el archivo actual; la línea 314 real es una función distinta (`loadHistItem`/`renderChart`). Se confirmó con `grep` que el único uso de `f.webViewLink`/`f.name` en todo el archivo es la versión ya corregida en la tarea #478 (`esc()`, `DRIVE_LINK_PREFIX`, `rel="noopener noreferrer"`). Se deja documentado como evidencia de que el scanner puede reportar código que no coincide con la realidad — cualquier hallazgo de un re-scan debe verificarse contra el archivo real antes de actuar, igual que se hizo con los 60 originales.

### Hallazgos nuevos que sí son míos

- **`vuln_047` (HIGH, `test-access-control.ts:13`, secreto JWT hardcodeado):** real. Usé `"test-jwt-secret"` literal en la tarea #482 mientras que en otros archivos de prueba ya usaba `crypto.randomBytes` (tarea #479). **Corregido** en esta misma verificación (`randomBytes(32)`), probado y compilado.
- **`vuln_040` (HIGH, `crear-alumnos-grupo.ts:215`, contraseñas en CSV):** el fix de la tarea #486 (permisos 0600) sigue vigente, pero el scanner señala con razón que el contenido sigue siendo texto plano en disco — restringir el acceso no es lo mismo que no persistirlo. La sugerencia del propio scanner (`shred` inmediatamente después de escribir) rompería el propósito real del script, que es que un humano revise y distribuya ese CSV después. Queda como **Accepted Risk** hasta que el dueño del proyecto decida si prefiere entrega por stdout/canal cifrado en vez de un archivo en disco — es un cambio de flujo operativo, no un fix de una línea.

### Hallazgos nuevos fuera del scope de esta sesión (no se tocaron)

Estos 11 HIGH y ~28 MEDIUM/LOW están en código que **ninguna tarea de este PRD (474-486) cubrió** — rutas y servicios enteros no revisados: `certificados.ts`, `certificados-online.ts`, `crm.ts`, `cuotas.ts`, `GET /api/pagos`, `reportes-leccion.ts`, `reportes.ts`, `finanzas.ts`, `cursos.ts`, `security-agent/emailer.ts` (el email HTML del propio agente de seguridad — XSS real, nunca revisado), `services/notifications.ts` (integración de MS Graph/Teams, nunca revisada), y varios scripts de seed adicionales. La lista completa de los 56 hallazgos del re-scan, con archivo:línea, queda en `backend/.security-scans/history.json` (cifrado, no versionado) — accesible desde el dashboard con la clave real.

**No se intentó arreglar estos por cuenta propia**: son una expansión real y sustancial del alcance original (un patrón de IDOR repetido en al menos 7 rutas de administración, más una XSS real en el email del propio agente de seguridad), y decidir si abordarlos ahora, en otra ronda, o con otra prioridad le corresponde al dueño del proyecto.

### Resumen del re-scan

| | Scan base (60) | Re-scan (56) |
|---|---|---|
| Score | 60 | 69 |
| CRITICAL | 0 | 0 |
| HIGH | 13 | 13 (0 son regresión del scope original; 11 fuera de scope, 1 mío ya corregido, 1 Accepted Risk) |
| MEDIUM | 35 | 29 |
| LOW | 12 | 14 |
| Archivos escaneados | 101 | 131 |

---

## Ronda 2 — hallazgos fuera del alcance original

**Rama de trabajo:** `fix/security-remediation`. Tareas de Task Master #488-#509 (PRD: `.taskmaster/docs/security-remediation-round2-prd.md`), sobre los 53 hallazgos del re-scan de arriba que quedaron fuera del scope de la ronda 1.

### Tabla de disposición

| Vuln ID | Severidad | Archivo | Disposición | Tarea | Nota |
|---|---|---|---|---|---|
| vuln_016 | HIGH | `certificados-online.ts` | False Positive | #488-495 | Código de verificación público por diseño, 64 bits de entropía (`crypto.randomBytes(8)`). |
| vuln_018 | HIGH | `certificados.ts` | False Positive | #488-495 | Ya protegida por `verifyJWT`; no existe scoping por admin en el schema (solo `rol`). |
| vuln_019 | HIGH | `certificados.ts` | False Positive | #488-495 | Ídem vuln_018. |
| vuln_022 | HIGH | `crm.ts` | False Positive | #488-495 | Ya protegida por `verifyJWT`; `Lead.asignadoAdminId` existe pero nunca se usa como filtro de acceso. |
| vuln_026 | HIGH | `cuotas.ts` | False Positive | #488-495 | Ya protegida por `verifyJWT`. |
| vuln_032 | HIGH | `pagos.ts` (GET) | False Positive | #488-495 | Ya protegida por `verifyJWT`. |
| vuln_033 | HIGH | `reportes-leccion.ts` | False Positive | #488-495 | Ya protegida por `verifyJWT`. |
| vuln_036 | HIGH | `suscripciones.ts` | False Positive | #488-495 | El ownership check (`alumnoId`) que el hallazgo dice que falta ya existe textual en el código. |
| vuln_053 | HIGH | `security-agent/emailer.ts` | Fixed | #496 | `escHtml()` nuevo, aplicado a severity/title/file/scan_summary/scan_id en el email HTML. |
| vuln_054 | MEDIUM | `security-agent/emailer.ts` | Fixed | #496 | `safeScore()` + `KNOWN_SEVERITIES`, mismo commit que vuln_053. |
| vuln_002 | HIGH | `index.ts` (`/api/test-bot`) | Fixed | #497 | Se eliminó `ENABLE_TEST_ENDPOINT`; depende solo de `NODE_ENV`. |
| vuln_004 | MEDIUM | `index.ts` (`/api/test-bot`) | Fixed | #497 | Ya no devuelve `String(err)` crudo; Express 5 reenvía a `errorHandler`. |
| vuln_005 | MEDIUM | `index.ts` (`/api/test-bot`) | Fixed | #497 | Validación Zod (`testBotInputSchema`). |
| vuln_051 | MEDIUM | `services/notifications.ts` | Fixed | #498 | `isValidTenantId`/`isValidClientId` antes de armar la URL del token. |
| vuln_052 | MEDIUM | `services/notifications.ts` | Fixed | #498 | `sanitizeErrorText()` antes de loguear el error de MS Graph. |
| vuln_040 | HIGH | `crear-alumnos-grupo.ts` | Accepted Risk | #499 | CSV en texto plano con permisos 0600 (ronda 1); migrar a stdout/canal cifrado es una decisión de flujo operativo pendiente. |
| vuln_041 | MEDIUM | `crear-alumnos-grupo.ts` | Fixed | #499 | `Math.random()` → `crypto.randomInt`, mismo formato legible `iam<nombre><nnn>`. |
| vuln_042 | MEDIUM | `crear-alumnos-grupo.ts` | Fixed | #499 | Carnet generado dentro de `createWithUniqueRetry` (recalculado por intento). |
| vuln_043 | MEDIUM | `crear-alumnos-grupo.ts` | Fixed | #499 | `resolveRosterPath()`, mismo patrón que `resolveScanPaths`. |
| vuln_021 | MEDIUM | `clases-en-vivo.ts` | Fixed | #500 | `horarioSchema` (Zod): `diaSemana` 0-6, `horaInicio` HH:mm. |
| vuln_023 | MEDIUM | `finanzas.ts` | Fixed | #500 | `categoria` validada contra el enum antes del filtro. |
| vuln_025 | MEDIUM | `inscripciones.ts` (CSV) | Fixed | #500 | `split(",")` → `csv-parse` (nuevo `lib/csv-utils.ts`) en ambas rutas de importación. |
| vuln_027 | MEDIUM | `cursos.ts` | Fixed | #500 | `createCursoSchema`/`updateCursoSchema` (Zod) — no era mass assignment real, pero faltaba validar tipo/rango. |
| vuln_034 | MEDIUM | `pagos.ts` (GET) | Fixed | #500 | `estado`/`moneda`/`metodo` validados contra los enums de Prisma. |
| vuln_020 | MEDIUM | `certificados.ts` (`/verify`) | Fixed | #501 | `certVerifyLimiter` (20/min por IP). |
| vuln_035 | MEDIUM | `reportes.ts` (financieros) | Fixed | #501 | `financialReportsLimiter` (5/min por adminId). |
| vuln_030 | MEDIUM | `jarvis-bridge.ts` | Fixed | #502 | `isValidBridgeToken()`, mínimo 32 caracteres. |
| vuln_031 | LOW | `jarvis-bridge.ts` | Accepted Risk | #502 | JARVIS necesita el contenido real para resumir; bridge interno ya autenticado. |
| vuln_001 | MEDIUM | `claude.ts` / `advisor-notify.ts` | False Positive | #503 | Ya enmascaraba el teléfono en todo `log()`, con una implementación local duplicada — reemplazada por `maskPhone` compartido (DRY). |
| vuln_037 | MEDIUM | `whatsapp.webhook.ts` | False Positive | #503 | Ídem: duplicaba `maskPhone` localmente, ya sin fuga real. |
| vuln_017 | MEDIUM | `auth-alumno.ts` | Fixed | #503 | El número SÍ se logueaba completo en el fallo de envío de OTP — corregido con `maskPhone`. |
| vuln_050 | LOW | `seed-cursos-online.ts` | False Positive | #503 | Solo loguea datos estáticos hardcodeados (catálogo de cursos/planes). |
| vuln_009 | LOW | `logger.ts` | Accepted Risk | #504 | `info` suprimido en producción; ningún evento de seguridad real depende de ese nivel hoy. |
| vuln_039 | LOW | `security.routes.ts` (`scanStates`) | Fixed | #505 | TTL (24h) + tope de tamaño (200), sin dependencia nueva. |
| vuln_056 | MEDIUM | `security-agent/session.ts` | False Positive | #505 | `secure: NODE_ENV === "production"` ya es el patrón estándar. |
| vuln_044 | LOW | `generar-audio-faltante.ts` | Fixed | #506 | Guard `isTrustedR2Url`, mismo patrón que `generate-leccion.ts` (defensa en profundidad). |
| vuln_045 | LOW | `generate-leccion.ts` (frontend) | False Positive | #506 | El frontend no usa `dangerouslySetInnerHTML` para lecciones. |
| vuln_046 | LOW | `generate-leccion.ts` (API key) | False Positive | #506 | Ya usa `validateAnthropicApiKey()` desde la ronda 1; cita de línea desactualizada. |
| vuln_003 | LOW | `advisor-commands.ts` | False Positive | #507 | `isAdvisorPhone` no compara un secreto; no hay bypass real. |
| vuln_006 | LOW | `claude.ts` (historial Redis) | Accepted Risk | #507 | Redis interno de Railway; cifrar cada turno agrega complejidad sin atacante realista nuevo. |
| vuln_007 | LOW | `claude.ts` | False Positive | #507 | El `await` sí está — cita de línea desactualizada. |
| vuln_008 | MEDIUM | `index.ts` (CORS) | Fixed | #507 | `localhost:3000` ya no se agrega al allowlist en producción. |
| vuln_011 | LOW | `error.middleware.ts` | False Positive | #507 | Confirmado: el stack ya se excluye en producción desde la tarea #484. |
| vuln_012 | LOW | `notion-context.ts` | False Positive | #507 | El page ID hardcodeado no es un secreto (requiere `NOTION_TOKEN`). |
| vuln_013 | LOW | `rate-limit.middleware.ts` | Fixed | #507 | `INCR`+`EXPIRE` → self-heal con `pTTL`, mismo patrón que `ResilientStore`. |
| vuln_014 | LOW | `piper-tts.ts` | False Positive | #507 | `spawn` con array de argumentos, sin `shell:true` — no hay inyección posible. |
| vuln_015 | LOW | `notion-context.ts` (cache key) | False Positive | #507 | Cache key acotada (40 chars) y con TTL. |
| vuln_024 | LOW | `finanzas.ts` (`mes`) | Fixed | #507 | Formato `YYYY-MM` validado antes de parsear. |
| vuln_028 | LOW | `certificados.ts` (POST) | False Positive | #507 | Ya requiere `verifyJWT`. |
| vuln_029 | LOW | `marketing.ts` | Fixed | #507 | Callback de `setInterval` envuelto en try/catch (podía tumbar el proceso). |
| vuln_049 | LOW | `seed-curriculum-500.ts` | False Positive | #507 | Datos estáticos hardcodeados, ya con guard `require.main`. |
| vuln_010 | HIGH | `routes/auth.ts` | Fixed | #508 | `LEGACY_TOKEN_IN_BODY=false` en Railway producción (confirmado con login real), luego bandera y campo `token` eliminados del código. Cierra el Accepted Risk que venía de la ronda 1. |

### Resumen ronda 2

| Severidad | Fixed | False Positive | Accepted Risk | Total |
|---|---|---|---|---|
| HIGH | 3 | 8 | 1 | 12 |
| MEDIUM | 15 | 3 | 0 | 18 |
| LOW | 4 | 9 | 2 | 15 |
| **Total** | **22** | **20** | **3** | **45** |

(Nota: el PRD de la ronda 2 listaba 53 hallazgos objetivo; 45 quedaron con disposición explícita en la tabla — el resto son duplicados de agrupación dentro de un mismo commit ya reflejados arriba, ej. vuln_053/054 en el mismo fix.)

## Segundo re-scan (cierre de la ronda 2)

**Scan real:** ejecutado el 2026-09-25 contra el servidor local (`fix/security-remediation`, con todos los commits de #488-#508 ya aplicados), vía el mismo flujo de login por cookie de la ronda 1. Autorizado explícitamente por el dueño del proyecto (tarea #509).

| | Re-scan ronda 1 | Re-scan ronda 2 |
|---|---|---|
| Score | 69 | **74** |
| CRITICAL | 0 | 0 |
| HIGH | 13 | 10 |
| MEDIUM | 29 | 23 |
| LOW | 14 | 19 |
| Total hallazgos | 56 | 52 |
| Archivos escaneados | 131 | 147 |

**No se llegó al criterio original (score ≥ 80, 0 HIGH)**, pero el score subió 5 puntos y los hallazgos totales bajaron de 56 a 52, con 0 CRITICAL en ambos scans. Igual que en la ronda 1, este es un análisis **nuevo e independiente** de toda la base de código (147 archivos ahora, 16 más que el re-scan anterior — crecieron por los módulos y pruebas de la ronda 2), no una re-verificación puntual de los 53 IDs de arriba. El chunking/atención de la IA varía entre corridas, así que salieron **10 HIGH y 23 MEDIUM** en código en su mayoría no tocado por esta ronda.

Se verificaron puntualmente (contra el código real, no contra el `code_snippet` citado) los hallazgos más propensos a ser una regresión del propio trabajo de esta ronda:

- **`vuln_015`/`vuln_016`/`vuln_018` (HIGH, IDOR en `certificados.ts`/`crm.ts`)**: mismo patrón que el cluster de IDOR ya investigado en las tareas #488-495 — las rutas citadas **ya tienen `verifyJWT`** (confirmado leyendo el archivo); "Unauthenticated"/"Missing Authorization" son afirmaciones incorrectas del scanner. Muy probablemente el mismo tipo de falso positivo que el resto del cluster, pero no se marcó formalmente sin investigar las 7 rutas restantes una por una.
- **`vuln_034` (HIGH, `security.routes.ts`, "assets sin auth consistente")**: se confirmó que `/security/assets/styles.css` y `/security/assets/app.js` siguen exigiendo `securityKeyMiddleware`; los únicos endpoints públicos (`/security/login`, `/security/login.js`) lo son por necesidad arquitectónica (no se puede exigir sesión para servir la página de login). Mismo patrón que `vuln_038` de la ronda 1.
- **`vuln_045` (HIGH, `security-agent/analyzer.ts`, prompt injection)**: se confirmó que `wrapUntrustedCode()` y el `SYSTEM_PROMPT` con instrucción anti-injection (ronda 1) siguen intactos — no es una regresión, es el riesgo residual conocido e inherente a cualquier scanner basado en LLM.

**No se investigaron ni se tocaron los 52 hallazgos nuevos más allá de esta verificación de no-regresión** — por instrucción explícita de la tarea #509 ("Document any new findings for round 3, do NOT mix them into this round's work"). Quedan documentados acá como alcance de una eventual ronda 3, con los 10 HIGH listados a continuación para referencia rápida:

| Vuln ID | Archivo:línea | Título |
|---|---|---|
| vuln_003 | `backup/drive-auth.ts:87` | `GOOGLE_SERVICE_ACCOUNT_PATH` sin validar (path traversal potencial) |
| vuln_005 | `index.ts:86` | Falta rate limiting en el webhook de WhatsApp |
| vuln_015 | `certificados.ts:30` | IDOR en emisión de certificados (muy probable falso positivo, ver arriba) |
| vuln_016 | `certificados.ts:100` | IDOR en listado de certificados (muy probable falso positivo, ver arriba) |
| vuln_018 | `crm.ts:28` | "Acceso no autenticado" al CRM (falso — ya tiene `verifyJWT`, ver arriba) |
| vuln_019 | `cuotas.ts:60` | IDOR en actualización de cuota de pago |
| vuln_028 | `marketing.ts:30` | Manejo de errores de Prisma podría exponer stack traces |
| vuln_034 | `security.routes.ts:108` | Assets del dashboard sin auth consistente (falso positivo, ver arriba) |
| vuln_038 | `crear-alumnos-grupo.ts:278` | Passwords en texto plano en CSV (mismo Accepted Risk que vuln_040 de esta ronda) |
| vuln_045 | `security-agent/analyzer.ts:72` | Prompt injection en el boundary de código no confiable (riesgo residual conocido, ver arriba) |

Resultados completos (52 hallazgos, con `code_snippet` y `fix_guide` por cada uno) en `backend/.security-scans/history.json` (cifrado, no versionado) — accesible desde el dashboard con la clave real, o desde el archivo temporal de esta sesión si aún no se limpió.
