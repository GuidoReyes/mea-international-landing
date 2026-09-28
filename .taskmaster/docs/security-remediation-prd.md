# PRD: Remediación de las 60 vulnerabilidades del scan de seguridad IA (backend MEA)

## 1. Contexto

El 2026-09-20 se ejecutó el agente de seguridad (`backend/src/security-agent/`) contra `backend/src` (101 archivos, 7 chunks, modelo `claude-sonnet-4-6`).

- Scan ID: `b0da64e6-45dc-4cca-b4a9-f3cd391e7e29`. Resultados en `backend/.security-scans/history.json` (ignorado por git).
- Resultado base: **60 hallazgos** (0 CRITICAL, 13 HIGH, 35 MEDIUM, 12 LOW), puntaje 60 (promedio de chunks entre 52 y 78).
- Los hallazgos los generó una IA. Pueden existir falsos positivos, por eso toda tarea empieza verificando el hallazgo.
- Los IDs `vuln_NNN` de este documento son los del scan base y sirven de trazabilidad.

## 2. Objetivos y criterios de éxito

1. Cero hallazgos HIGH abiertos y cero CRITICAL.
2. Cada uno de los 60 hallazgos queda en un estado explícito: **Arreglado**, **Falso positivo** (con evidencia) o **Riesgo aceptado** (con justificación).
3. Un re-scan real final con puntaje >= 80 (el puntaje tiene ruido de +-10 entre corridas; se evalúa junto con el conteo de HIGH).
4. Sin regresiones: `npx tsc --noEmit` en `backend/` y en la raíz con 0 errores, y las rutas públicas del sitio siguen funcionando.

## 3. Reglas de ejecución (aplican a TODAS las tareas)

1. **Verificar primero.** Leer el código citado y confirmar que el hallazgo es real. Si es falso positivo, documentarlo con `task-master update-subtask` y cerrar sin cambios de código.
2. **Prueba primero (RED -> GREEN).** Escribir la prueba, verla fallar, arreglar, verla pasar. Patrón existente: scripts en `backend/src/scripts/test-*.ts` ejecutados con `node -r ts-node/register/transpile-only <archivo>`. Ejemplo: `test-security-middleware.ts`.
3. **Compilar.** `cd backend && npx tsc --noEmit` debe terminar con 0 errores.
4. **No romper contratos públicos.** Antes de cambiar una ruta o su respuesta, buscar consumidores en el frontend Next.js (`app/`, `components/`, `lib/`) y en `backend/src`.
5. **Prisma.** Solo `migrate dev` con migraciones aditivas. Prohibido `migrate reset` y `db push --force-reset`. Antes de agregar un constraint único, consultar si ya existen duplicados.
6. **Secretos.** Nunca en código, logs, commits ni en este PRD. No leer `.env`. No imprimir `code_snippet` de resultados de scan.
7. **Inmutabilidad.** Crear objetos nuevos en vez de mutar los existentes. Funciones de menos de 50 líneas.
8. **Un commit por tarea**, formato `fix(security): <descripcion>`.

## 4. Decisiones de diseño

### D1. Autenticación del dashboard: sesión por cookie (afecta a la tarea #83 y al PRD `security-backup-prd.md`)

`vuln_053` exige eliminar `?key=` y `sessionStorage`; `vuln_028` exige proteger los assets. El navegador no puede enviar un header `X-Security-Key` al cargar `<script>` o `<link>`, así que ambas correcciones solo son compatibles con una sesión por cookie:

- `POST /api/security/login` recibe la clave en el header `X-Security-Key`, la valida con `safeEqual` (D2) y responde con una cookie `httpOnly`, `SameSite=Strict`, `Secure` en producción, TTL corto (30 minutos).
- El middleware acepta el header `X-Security-Key` (clientes y CI) **o** la cookie de sesión. Se elimina el soporte de `?key=`.
- `/security` y `/security/assets/*` exigen sesión. Una página de acceso mínima, sin datos, pide la clave.
- **Conflicto con #83:** los ítems 34-36 de #83 y las líneas 119 y 267 de `security-backup-prd.md` asumen `?key=`. Al terminar esta decisión hay que actualizar #83: la prueba de `?key=` pasa a "login -> cookie -> 200; `?key=` -> 403".

### D2. Comparación segura única

Un helper `safeEqual(a, b)` en `backend/src/lib/safe-equal.ts` que compara los SHA-256 de ambos valores con `timingSafeEqual`. Nunca se usa relleno (`padEnd`). El middleware de seguridad ya aplica esta lógica desde el 2026-09-20 (arreglo del bypass por espacios finales, con `test-security-middleware.ts`) y se refactoriza para usar el helper.

### D3. Rate limiting con Redis

`express-rate-limit` con store Redis reutilizando el cliente de `backend/src/lib/redis.ts`. Existe ya `backend/src/middleware/rate-limit.middleware.ts`: se extiende, no se duplica. Si Redis no está disponible, se usa un store en memoria con advertencia en el log, para no tumbar el servicio.

### D4. Helpers de logging seguro

`backend/src/lib/log-sanitize.ts` con `sanitizeForLog(value)` (redacción recursiva sin mutar) y `maskPhone(tel)` (solo últimos 4 dígitos).

## 5. Paquetes de trabajo (cada uno es una tarea de Task Master)

### T1. Helper `safeEqual` y comparaciones seguras (prioridad ALTA)
- **Hallazgos:** `vuln_020` (`routes/jarvis-bridge.ts:26`, HIGH), `vuln_014` (`middleware/hmac.middleware.ts:25`, LOW), `vuln_038` (`routes/whatsapp.webhook.ts:175`, LOW).
- **Hacer:** crear `safe-equal.ts` (D2); aplicarlo en los tres sitios; refactorizar `security-agent/middleware.ts` para usarlo.
- **Aceptación:** pruebas de igual, distinto, prefijo, espacios finales, longitudes distintas y unicode; `test-security-middleware.ts` sigue verde.

### T2. Rate limiting con Redis (prioridad ALTA)
- **Hallazgos:** `vuln_021` (`routes/marketing.ts:53`, HIGH, sin límites en ninguna ruta), `vuln_005` (`index.ts:89`, webhook de WhatsApp y `/api/test-bot`), `vuln_056` (`security-agent/middleware.ts:1`, scan y autenticación fallida), `vuln_039` (`routes/suscripciones.ts:155`, subida de comprobante), `vuln_012` (`routes/auth-alumno.ts:44`, limitador en memoria), `vuln_030` (`routes/suscripciones.ts:32`, limitador en memoria).
- **Hacer:** D3. Límites por defecto como constantes configurables por variable de entorno: global 300/15 min por IP; login 10/15 min; `/api/security/scan` 2/hora; autenticación fallida del agente 10/15 min; comprobante 3/hora por `pagoId`; webhooks con límite generoso por teléfono o IP para no bloquear a Meta ni Twilio. Migrar los dos limitadores en memoria (`vuln_012`, `vuln_030`) al store Redis.
- **Aceptación:** superar el límite devuelve 429; los webhooks legítimos no se bloquean; con dos instancias el conteo se comparte; caída de Redis registra advertencia y no rompe el servicio.

### T3. Logging seguro (prioridad ALTA)
- **Hallazgos:** `vuln_009` (`middleware/audit.middleware.ts:11`, HIGH, cuerpo de la petición en la auditoría), `vuln_004` (`lib/logger.ts:9`, stack traces y metadatos), `vuln_007` (`lib/advisor-notify.ts:75`, teléfono en el log), `vuln_049` (`scripts/seed-curriculum.ts:417`, `console.error(err)` crudo).
- **Hacer:** D4. Lista de campos sensibles a redactar: `password`, `token`, `secret`, `codigo`, `codigoHash`, `authorization`, `cookie`, `refresh_token`, `api_key`. Aplicarla de forma recursiva antes de serializar `req.body`. El logger registra solo `message` y `code`; el stack solo si `NODE_ENV` no es producción. Auditar todas las llamadas a `log(` que incluyan teléfonos y aplicar `maskPhone`.
- **Aceptación:** pruebas de redacción con objetos anidados; el objeto original no se modifica; `grep` no encuentra teléfonos completos en llamadas a `log(`.

### T4. Dashboard del agente: modelo de autenticación (prioridad ALTA)
- **Hallazgos:** `vuln_028` (`routes/security.routes.ts:42`, HIGH, assets sin autenticación), `vuln_053` (`security-agent/dashboard/app.js:2`, HIGH, clave en URL y `sessionStorage`).
- **Hacer:** implementar D1 completa (login, cookie, middleware dual, eliminar `?key=` y `sessionStorage`, proteger `/security/assets/*`). Actualizar el PRD `security-backup-prd.md` y los ítems 34-36 de la tarea #83.
- **Depende de:** T1 (usa `safeEqual`).
- **Aceptación:** sin cookie ni header -> 403 (incluidos los assets); `?key=` -> 403; login válido -> cookie `httpOnly` -> dashboard 200; el dashboard carga sus assets con la cookie.

### T5. Dashboard del agente: XSS y enlaces (prioridad ALTA)
- **Hallazgos:** `vuln_054` (`dashboard/app.js:237`, HIGH, enlaces de Drive sin sanitizar), `vuln_055` (`dashboard/app.js:296`, `renderHistory` con `innerHTML`), `vuln_060` (`dashboard/app.js:237`, falta `rel="noopener noreferrer"`).
- **Hacer:** aplicar `esc()` a todos los campos que se insertan con `innerHTML`; usar `textContent` donde sea posible; validar que `webViewLink` empiece por `https://drive.google.com/`; validar que `security_score` sea numérico; agregar `rel="noopener noreferrer"` a todo `target="_blank"`; configurar una CSP restrictiva (con `helmet`, ya presente) para las rutas `/security`.
- **Depende de:** T4 (mismo archivo).
- **Aceptación:** un nombre de archivo o título con `<img src=x onerror=...>` se muestra como texto y no ejecuta código.

### T6. Agente de seguridad: endurecimiento del backend (prioridad MEDIA)
- **Hallazgos:** `vuln_058` (`security-agent/storage.ts:55`, `vulnId` sin validar), `vuln_059` (`storage.ts:27`, historial sin cifrar), `vuln_057` (`scanner.ts:101`, path traversal vía `SECURITY_SCAN_PATHS`), `vuln_052` (`analyzer.ts:51`, código enviado al modelo sin delimitar), `vuln_051` (`analyzer.ts:88`, `ANTHROPIC_API_KEY` sin validar), `vuln_050` (`scripts/test-security-middleware.ts:45`, secreto fijo en la prueba).
- **Hacer:** validar `vulnId` con un formato estricto; cifrar `history.json` con AES-256-GCM (clave derivada de `SECURITY_DASHBOARD_SECRET`) y migrar el archivo existente; como mínimo permisos `0600`; restringir `SECURITY_SCAN_PATHS` a rutas dentro del proyecto con `path.resolve`; envolver el código en delimitadores y decirle al modelo que es dato no confiable; validar el formato de la API key sin registrarla; usar `crypto.randomBytes` para el secreto de la prueba.
- **Riesgo:** rotar `SECURITY_DASHBOARD_SECRET` invalidaría el historial cifrado; documentarlo.
- **Aceptación:** pruebas de path fuera del proyecto, `vulnId` inválido y lectura del historial cifrado.

### T7. Backup y Google Drive (prioridad ALTA; debe hacerse antes de las pruebas de backup de #83, ítems 17-27)
- **Hallazgos:** `vuln_001` (`backup/dumper.ts:32`, HIGH, contraseña de la BD en los argumentos de `mysqldump`), `vuln_003` (`backup/cleaner.ts:42`, ID de carpeta sin validar en la consulta), `vuln_002` (`lib/drive-comprobantes.ts:22`, consulta de Drive con nombre sin sanear), `vuln_008` (`backup/drive-auth.ts:45`, `JSON.parse` sin manejo de error), `vuln_006` (`backup/scheduler.ts:56`, `BACKUP_CRON_SCHEDULE` sin validar).
- **Hacer:** pasar la contraseña con `MYSQL_PWD` o con `--defaults-extra-file` en un archivo temporal `0600` que se borra en `finally`; helper compartido `escapeDriveQueryValue` para `cleaner.ts` y `drive-comprobantes.ts`; validar el ID de carpeta con `/^[a-zA-Z0-9_-]{10,50}$/` al arrancar; `try/catch` y validación de campos en `drive-auth.ts`; validar el cron con la función de validación de la librería de cron y quitar caracteres de control antes de loguear.
- **Aceptación:** `ps` no muestra la contraseña durante un volcado; pruebas de escape con comillas y barras; cron inválido rechazado con mensaje claro.

### T8. Webhooks y mensajería (prioridad ALTA)
- **Hallazgos:** `vuln_034` (`routes/webhooks-recurrente.ts:54`, HIGH, `rawBody` vacío), `vuln_016` (`middleware/twilio-webhook.middleware.ts:22`, se omite la verificación sin token), `vuln_033` (`routes/twilio.webhook.ts:59`, remitente admin sin verificar), `vuln_035` (`routes/whatsapp.webhook.ts:144`, teléfono sin normalizar como clave).
- **Hacer:** si falta `req.rawBody`, responder 400 sin caer a cadena vacía y verificar el orden del middleware; en producción, fallar de forma dura si no hay token de Twilio (omitir solo en `development` o `test`, con aviso); tras validar la firma, comprobar que `From` sea `ADMIN_TWILIO_WHATSAPP` e ignorar en silencio otros remitentes; función `normalizePhone` aplicada al recibir y al buscar. **Verificar los datos existentes** antes de cambiar el formato almacenado.
- **Depende de:** T1.
- **Aceptación:** pruebas de firma inválida, `rawBody` ausente, remitente no admin y teléfonos con y sin `+`.

### T9. Control de acceso e IDOR (prioridad ALTA)
- **Hallazgos:** `vuln_019` (`routes/inscripciones.ts:55`, HIGH), `vuln_018` (`routes/ediciones.ts:33`, GET sin autenticación), `vuln_031` (`routes/suscripciones.ts:68`, plan no público seleccionable), `vuln_037` (`routes/suscripciones.ts:196`, comprobante sin comprobar el estado del pago).
- **Hacer:** exigir rol ADMIN o que el `alumnoId` sea del usuario; **antes de proteger los GET de ediciones, confirmar si el sitio público los consume** y, si es así, crear una vista pública sin datos personales en vez de exigir JWT; filtrar `PlanPrecio` por `activo: true` y el plan como público; exigir `pago.estado === 'PENDIENTE'` y responder 409 en otro caso.
- **Aceptación:** un alumno no lee inscripciones ajenas; el catálogo público sigue funcionando; pruebas 403/404/409.

### T10. Autenticación (prioridad MEDIA)
- **Hallazgos:** `vuln_010` (`routes/auth.ts:75`, JWT en el cuerpo de la respuesta), `vuln_011` (`routes/alumnos.ts:107`, `Math.random()` para contraseñas temporales), `vuln_013` (`routes/auth-alumno.ts:295`, temporización del OTP).
- **Hacer:** quitar el token del cuerpo detrás de una bandera `LEGACY_TOKEN_IN_BODY`, migrar el frontend administrativo a la cookie `httpOnly` y luego eliminar la bandera; generar contraseñas con `crypto.randomBytes` o `randomInt` (12 caracteres o más); ejecutar siempre `bcrypt.compare` (con un hash falso si no existe el registro de OTP).
- **Riesgo:** quitar el token del cuerpo rompe el frontend si aún lo usa; buscar consumidores primero.
- **Aceptación:** el login sigue funcionando en el frontend; entropía de contraseñas verificada en prueba; tiempos de respuesta de OTP existente e inexistente comparables.

### T11. Validación de entradas y subidas (prioridad MEDIA)
- **Hallazgos:** `vuln_015` (`routes/clases-en-vivo.ts:154`, `urlZoom`), `vuln_023` (`routes/inscripciones.ts:38`, `estado` sin validar), `vuln_026` (`routes/inscripciones.ts:10`, subida sin MIME), `vuln_032` (`routes/suscripciones.ts:214`, extensión tomada del nombre de archivo), `vuln_029` (`routes/pagos.ts:37`, fechas inválidas), `vuln_022` (`routes/leads.ts:55`, inyección de fórmulas en CSV), `vuln_024` (`routes/ediciones.ts:45`, errores sin manejar).
- **Hacer:** esquema Zod para `urlZoom` (HTTPS y dominio `zoom.us`) en POST y PATCH; validar `estado` contra `ESTADOS_VALIDOS`; helper único `validateUpload` (lista de MIME permitidos y mapa MIME a extensión) usado por `vuln_026` y `vuln_032`; validar fechas y responder 400; prefijar con `'` los valores de CSV que empiecen por `=`, `+`, `-`, `@`, tabulador o retorno de carro; middleware central de errores sin stack en producción y `try/catch` en los handlers asíncronos.
- **Aceptación:** una prueba por caso (URL no Zoom, estado inválido, archivo `.exe` con MIME falso, fecha `abc`, celda `=cmd|...`).

### T12. Integridad de datos y condiciones de carrera (prioridad MEDIA)
- **Hallazgos:** `vuln_017` (`routes/alumnos.ts:56`, carnet duplicado), `vuln_027` (`routes/inscripciones.ts:258`, carnet duplicado), `vuln_025` (`routes/inscripciones.ts:135`, importación CSV con inscripciones duplicadas).
- **Hacer:** restricción única sobre el carnet y reintento ante el error de duplicado de Prisma (`P2002`), o un generador con sufijo aleatorio como el de `generarCarnetWeb()`; comprobación de duplicados dentro de la transacción de `importar-csv` y restricción única en `(alumnoId, edicionId)`. Migración solo aditiva con `migrate dev`.
- **Riesgo:** una restricción única falla si ya hay duplicados; consultar primero y limpiar con plan explícito.
- **Aceptación:** dos creaciones concurrentes no generan carnets iguales; importar dos veces el mismo CSV no duplica inscripciones.

### T13. Scripts operativos (prioridad MEDIA)
- **Hallazgos:** `vuln_036` (`scripts/crear-alumnos-grupo.ts:228`, HIGH, contraseñas en un CSV), `vuln_041` (`scripts/generar-tasks-500.ts:131`, HIGH, `execSync`), `vuln_040` (`generar-tasks-500.ts:116`, ruta sin validar), `vuln_047` (`generar-tasks-500.ts:117`, JSON externo sin validar), `vuln_043` (`scripts/generate-leccion.ts:238`, HIGH, SSRF), `vuln_042` (`generate-leccion.ts:149`, API key sin validar), `vuln_048` (`generate-leccion.ts:293`, contenido de IA sin sanear), `vuln_045` (`scripts/get-drive-token.ts:49`, HIGH, token en consola), `vuln_046` (`get-drive-token.ts:30`, OAuth sin `state`), `vuln_044` (`scripts/seed-admin.ts:8`, correo admin por defecto).
- **Hacer:** el CSV de credenciales (`*.credenciales.csv`) ya está en `.gitignore` y no está versionado; limitar sus permisos a `0600` y ofrecer entregar por `stdout`. Usar `execFile` en vez de `execSync`; **evaluar si `generar-tasks-500.ts` está obsoleto y eliminarlo en vez de parchearlo** (registrar la decisión). Permitir en `generate-leccion.ts` solo URLs con el prefijo del bucket R2. Validar la API key sin registrar el error completo. Verificar que el frontend renderiza el contenido de las lecciones sin `innerHTML` (el esquema `leccion-contenido.schema.ts` ya existe) y sanear los campos de texto. No imprimir el refresh token: escribirlo en un archivo `0600` o enmascararlo. Generar y validar un `state` aleatorio en el flujo OAuth. Exigir `ADMIN_EMAIL` sin valor por defecto.
- **Aceptación:** los scripts fallan con mensajes claros ante entradas inválidas; ningún script imprime secretos.

### T14. Verificación final y re-scan (prioridad ALTA; depende de T1 a T13)
- **Hacer:** compilar backend y raíz; ejecutar todas las pruebas; ejecutar un re-scan real (tarda unos 10 minutos y cuesta hasta unos USD 2, **requiere autorización explícita del dueño del proyecto antes de lanzarse**); comparar con el scan base (60 hallazgos, 13 HIGH, puntaje 60). Documentar cada uno de los 60 hallazgos como Arreglado, Falso positivo o Riesgo aceptado. Actualizar la tarea #83 y `security-backup-prd.md` con D1.
- **Aceptación:** cero HIGH y cero CRITICAL abiertos; puntaje >= 80; informe con la tabla de los 60 hallazgos.

## 6. Orden de ejecución y dependencias

1. **Fundaciones (independientes entre sí):** T1, T2, T3.
2. **Dashboard:** T4 (depende de T1) -> T5 -> T6.
3. **Backup:** T7 antes de continuar con las pruebas de backup de la tarea #83.
4. **Backend de negocio:** T8 (depende de T1), T9, T10, T11 y T12 pueden ir en paralelo. T11 y T12 comparten archivos con T9 (`inscripciones.ts`, `suscripciones.ts`, `ediciones.ts`): asignarlos al mismo trabajador o serializarlos.
5. **Scripts:** T13.
6. **Cierre:** T14, al final.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Falsos positivos de la IA | Regla 1: verificar antes de cambiar código |
| Proteger endpoints rompe el sitio público (T9, T10) | Regla 4: buscar consumidores antes |
| Constraint único falla por datos duplicados (T12) | Consultar duplicados antes de migrar; nunca resetear la BD |
| Rate limiting bloquea webhooks legítimos (T2) | Límites generosos en Meta y Twilio; fallback en memoria |
| Cifrar el historial pierde datos al rotar el secreto (T6) | Documentar y migrar el archivo existente |
| Cambio de D1 invalida pruebas de #83 | Actualizar #83 dentro de T4 y T14 |

## 8. Fuera de alcance

- Reescribir el sistema de autenticación completo o cambiar de proveedor de hosting.
- Nuevos hallazgos que aparezcan en el re-scan: se registran como tareas nuevas, no se mezclan aquí.
