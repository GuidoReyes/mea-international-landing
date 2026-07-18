# Task ID: 46

**Title:** Install node-cron and create scheduler for cuota alerts

**Status:** done

**Dependencies:** 45 ✓, 34 ✓

**Priority:** high

**Description:** Set up daily cron jobs for payment reminders via WhatsApp based on cuota due dates

**Details:**

Run npm install node-cron @types/node-cron in backend. Create backend/src/scheduler.ts. Import cron from node-cron. Set TZ=America/Guatemala in Railway env vars. Cron 1: cron.schedule('0 8 * * *', async () => {...}, {timezone: 'America/Guatemala'}) - query CuotaPago where estado=PENDIENTE AND fechaVence = now()+5 days. For each, get inscripcion.alumno.whatsapp, send WhatsApp: '⏰ Tu cuota de {curso} vence el {fecha}. Monto: Q{monto}.'. Cron 2: same time, fechaVence = today, urgent message. Cron 3: 9 AM, query fechaVence < today AND estado=PENDIENTE, update estado=VENCIDO, send WhatsApp notification. Use logger for cron execution logs. In backend/src/index.ts, import and call startScheduler() function after app.listen().

**Test Strategy:**

Manually set cuota fechaVence to today+5 days, wait for cron (or manually trigger function), verify WhatsApp sent. Test timezone by checking cron fires at 8 AM Guatemala time. Mock date/time in tests to avoid waiting.

## Subtasks

### 46.1. Install node-cron and @types/node-cron dependencies

**Status:** pending  
**Dependencies:** None  

Add node-cron package and its TypeScript type definitions to the backend project dependencies

**Details:**

Navigate to /Users/guidoreyes/Desktop/proyecto/backend directory. Run `npm install node-cron` to install the cron scheduling library. Run `npm install --save-dev @types/node-cron` to install TypeScript type definitions for node-cron. Verify both packages appear in package.json (node-cron in dependencies, @types/node-cron in devDependencies). This provides the scheduling infrastructure needed for automated WhatsApp payment reminders.

### 46.2. Create scheduler.ts with cron job structure and timezone configuration

**Status:** pending  
**Dependencies:** 46.1  

Build backend/src/scheduler.ts with three cron jobs (5-day reminder, same-day urgent, overdue processor) scheduled at 8 AM Guatemala time

**Details:**

Create backend/src/scheduler.ts file. Import cron from 'node-cron', prisma from './lib/prisma', and { sendWhatsAppMessage } from './lib/whatsapp-send'. Create startScheduler() function that will be exported. Inside startScheduler, define three cron.schedule calls with timezone: 'America/Guatemala'. Cron 1: schedule('0 8 * * *', async () => { console.log('[Scheduler] Running 5-day reminder cron...'); /* query and send logic */ }). Cron 2: schedule('0 8 * * *', async () => { console.log('[Scheduler] Running same-day urgent reminder...'); /* query and send logic */ }). Cron 3: schedule('0 9 * * *', async () => { console.log('[Scheduler] Running overdue processor...'); /* query and send logic */ }). Add console.log statements at the end of startScheduler: 'Scheduler initialized: 3 cron jobs registered'. Export startScheduler as named export. Note: Query implementation will be added in next subtask.

### 46.3. Implement Prisma queries and WhatsApp message sending for all three cron jobs

**Status:** pending  
**Dependencies:** 46.2  

Add database queries to fetch cuotas based on fechaVence and estado, then send formatted WhatsApp reminders using existing sendWhatsAppMessage function

**Details:**

In backend/src/scheduler.ts, implement Cron 1 (5-day reminder): Query `await prisma.cuotaPago.findMany({ where: { estado: 'PENDIENTE', fechaVence: { equals: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) } }, include: { inscripcion: { include: { alumno: true, curso: true } } } })`. For each cuota, extract alumno.whatsapp, curso.nombre, fechaVence (formatted), monto. Send WhatsApp: `await sendWhatsAppMessage(whatsapp, '⏰ Tu cuota de {curso} vence el {fecha}. Monto: Q{monto}.')`. Cron 2 (same-day urgent): Same query but fechaVence equals today (new Date().setHours(0,0,0,0)). Message: '🚨 URGENTE: Tu cuota de {curso} vence HOY. Monto: Q{monto}.' Cron 3 (overdue processor): Query cuotas where `fechaVence < today AND estado = 'PENDIENTE'`. Update estado to 'VENCIDO': `await prisma.cuotaPago.update({ where: { id: cuota.id }, data: { estado: 'VENCIDO' } })`. Send WhatsApp: '❌ Tu cuota de {curso} está VENCIDA desde {fecha}. Monto: Q{monto}. Contacta administración.' Add try-catch blocks with console.error for each cron job to handle errors gracefully.

### 46.4. Initialize scheduler in index.ts and configure Railway environment variable

**Status:** pending  
**Dependencies:** 46.3  

Import and call startScheduler() in backend entry point after server starts, and set TZ=America/Guatemala in Railway environment

**Details:**

In backend/src/index.ts, add import statement: `import { startScheduler } from './scheduler';`. After the app.listen() call (after line 69), add: `startScheduler();` with a comment above: `// Initialize cron jobs for cuota payment reminders`. This ensures the scheduler starts when the backend server starts. For Railway configuration: In Railway dashboard, navigate to project > backend service > Variables tab. Add new environment variable: Key='TZ', Value='America/Guatemala'. This sets the system timezone for the Node.js process, ensuring cron jobs fire at correct local time. Redeploy the backend service for changes to take effect.
