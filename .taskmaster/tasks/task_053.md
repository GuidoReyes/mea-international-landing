# Task ID: 53

**Title:** Create /api/marketing/campanas routes for WhatsApp broadcast

**Status:** done

**Dependencies:** 45 ✓

**Priority:** medium

**Description:** Build campaign management system with background processing and rate limiting for bulk WhatsApp sends

**Details:**

Create backend/src/routes/marketing.ts. GET /api/marketing/campanas: list campaigns. POST: Zod validate {nombre, template (string with {nombre}, {curso} placeholders), variables: string[]}. Create CampanaWhatsApp. POST /api/marketing/campanas/:id/enviar: body {leadIds[]}. Create CampanaDestinatario records in bulk. Update campana.estado='ENVIANDO'. Spawn background process (use setInterval): fetch PENDIENTE destinatarios in chunks of 10, for each: replace template variables with lead data, call sendWhatsAppMessage(), update destinatario.estado='ENVIADO'/'ERROR', increment campana.enviados/errores. Rate limit: 10 messages per 200ms = 50 msg/s (under Meta's 80/s limit). Clear interval when all sent, set campana.estado='COMPLETADA'. GET /api/marketing/campanas/:id/status: return {estado, totalDestinatarios, enviados, errores, progreso: enviados/total*100}.

**Test Strategy:**

Create campaign, select 20 leads, trigger enviar. Poll /status endpoint, verify counters increment. Check destinatarios table updates. Test rate limiting doesn't exceed Meta limits (monitor Meta dashboard). Test error handling if WhatsApp API fails.

## Subtasks

### 53.1. Add Prisma models for campaign management and install zod

**Status:** pending  
**Dependencies:** None  

Create CampanaWhatsApp and CampanaDestinatario models in Prisma schema and install zod validation library

**Details:**

Add to backend/prisma/schema.prisma:

model CampanaWhatsApp {
  id                 Int                     @id @default(autoincrement())
  nombre             String
  template           String                  @db.Text
  variables          Json
  estado             String                  @default("CREADA")
  totalDestinatarios Int                     @default(0)
  enviados           Int                     @default(0)
  errores            Int                     @default(0)
  creadoEn           DateTime                @default(now())
  actualizadoEn      DateTime                @updatedAt
  destinatarios      CampanaDestinatario[]
}

model CampanaDestinatario {
  id         Int              @id @default(autoincrement())
  campanaId  Int
  campana    CampanaWhatsApp  @relation(fields: [campanaId], references: [id])
  leadId     Int
  lead       Lead             @relation(fields: [leadId], references: [id])
  estado     String           @default("PENDIENTE")
  error      String?
  enviadoEn  DateTime?
  creadoEn   DateTime         @default(now())
}

Also add destinatarios relation to Lead model: destinatarios CampanaDestinatario[]

Run: npm install zod in backend directory, then npx prisma migrate dev --name add-campana-whatsapp

### 53.2. Create GET and POST /api/marketing/campanas endpoints with validation

**Status:** pending  
**Dependencies:** 53.1  

Implement campaign listing and creation endpoints with zod schema validation for template and variables

**Details:**

Create backend/src/routes/marketing.ts following existing route patterns (cursos.ts, leads.ts):

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { verifyJWT } from '../middleware/auth.middleware';

const router = Router();

const createCampanaSchema = z.object({
  nombre: z.string().min(1),
  template: z.string().min(1),
  variables: z.array(z.string())
});

router.get('/', verifyJWT, async (req: Request, res: Response) => {
  const campanas = await prisma.campanaWhatsApp.findMany({
    orderBy: { creadoEn: 'desc' },
    include: { _count: { select: { destinatarios: true } } }
  });
  res.json(campanas);
});

router.post('/', verifyJWT, async (req: Request, res: Response) => {
  const validation = createCampanaSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: 'Datos inválidos', details: validation.error });
    return;
  }
  const { nombre, template, variables } = validation.data;
  const campana = await prisma.campanaWhatsApp.create({
    data: { nombre, template, variables }
  });
  res.status(201).json(campana);
});

export default router;

Register route in backend/src/index.ts: import marketingRouter from './routes/marketing'; app.use('/api/marketing/campanas', marketingRouter);

### 53.3. Implement POST /api/marketing/campanas/:id/enviar with background processing

**Status:** pending  
**Dependencies:** 53.2  

Create endpoint to trigger bulk WhatsApp sends with rate-limited background processing using setInterval

**Details:**

Add to backend/src/routes/marketing.ts:

const enviarCampanaSchema = z.object({
  leadIds: z.array(z.number()).min(1)
});

router.post('/:id/enviar', verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return; }
  
  const validation = enviarCampanaSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: 'leadIds requerido' });
    return;
  }
  
  const campana = await prisma.campanaWhatsApp.findUnique({ where: { id } });
  if (!campana) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
  
  const { leadIds } = validation.data;
  
  // Create destinatarios in bulk
  await prisma.campanaDestinatario.createMany({
    data: leadIds.map(leadId => ({ campanaId: id, leadId }))
  });
  
  await prisma.campanaWhatsApp.update({
    where: { id },
    data: { estado: 'ENVIANDO', totalDestinatarios: leadIds.length }
  });
  
  // Start background process
  procesarEnvios(id);
  
  res.json({ message: 'Envío iniciado' });
});

Implement procesarEnvios function: use setInterval every 200ms. Fetch 10 PENDIENTE destinatarios with lead data. For each: replace {nombre}, {curso} etc in template with lead data, call sendWhatsAppMessage from '../lib/whatsapp-send', update destinatario estado to ENVIADO/ERROR, increment campana enviados/errores. Clear interval when no more PENDIENTE. Set campana estado to COMPLETADA.

### 53.4. Create GET /api/marketing/campanas/:id/status endpoint

**Status:** pending  
**Dependencies:** 53.3  

Implement status endpoint returning campaign progress metrics and completion percentage

**Details:**

Add to backend/src/routes/marketing.ts:

router.get('/:id/status', verifyJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  
  const campana = await prisma.campanaWhatsApp.findUnique({
    where: { id },
    select: {
      estado: true,
      totalDestinatarios: true,
      enviados: true,
      errores: true
    }
  });
  
  if (!campana) {
    res.status(404).json({ error: 'Campaña no encontrada' });
    return;
  }
  
  const progreso = campana.totalDestinatarios > 0 
    ? (campana.enviados / campana.totalDestinatarios) * 100 
    : 0;
  
  res.json({
    estado: campana.estado,
    totalDestinatarios: campana.totalDestinatarios,
    enviados: campana.enviados,
    errores: campana.errores,
    progreso: Math.round(progreso * 100) / 100
  });
});

This endpoint allows frontend to poll for real-time campaign progress updates.
