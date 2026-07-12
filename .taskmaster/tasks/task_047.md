# Task ID: 47

**Title:** Install PDF generation libraries and create /api/certificados routes

**Status:** pending

**Dependencies:** 45

**Priority:** medium

**Description:** Build certificate generation system with PDFKit, QR codes, and Cloudflare R2 storage

**Details:**

Run npm install pdfkit qrcode @types/pdfkit @types/qrcode @aws-sdk/client-s3 in backend. Create backend/src/routes/certificados.ts. POST /api/certificados: body {inscripcionId}. Verify inscripcion.estado='COMPLETADA'. Generate codigo: crypto.randomBytes(8).toString('hex'). Generate QR PNG with qrcode.toDataURL(`https://www.mea.edu.gt/verify/${codigo}`). Create PDF with PDFKit: load logo from public folder, add text 'Certificado de Finalización', alumno nombre, curso nombre, fecha emission, embed QR image. Convert PDFKit stream to buffer. Upload to Cloudflare R2 using S3Client from @aws-sdk/client-s3: endpoint https://{CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com, credentials from env vars, bucket CLOUDFLARE_R2_BUCKET, key certificados/{codigo}.pdf. Construct urlPdf from CLOUDFLARE_R2_PUBLIC_URL. Save Certificado record. GET /api/certificados: list with filter alumnoId. GET /api/certificados/verify/:codigo: no JWT, query by codigo, return {valid: boolean, alumno, curso, fecha} or 404. Use Redis cache 24h for verify endpoint (key: cert:{codigo}).

**Test Strategy:**

Mark inscripcion as COMPLETADA, POST certificados, verify PDF uploads to R2 and URL accessible. Call verify endpoint, check Redis cache hit. Test invalid codigo returns 404.

## Subtasks

### 47.1. Install PDF generation dependencies and configure Cloudflare R2 environment variables

**Status:** pending  
**Dependencies:** None  

Install required npm packages for PDF generation and QR codes, then configure Cloudflare R2 storage credentials in Railway and local environment

**Details:**

Run `cd backend && npm install pdfkit qrcode @types/pdfkit @types/qrcode @aws-sdk/client-s3` to install dependencies. Add to backend/.env.example: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET (default: mea-certificados), CLOUDFLARE_R2_PUBLIC_URL (e.g., https://cdn.mea.edu.gt). Configure these same variables in Railway dashboard under backend service environment variables. Verify installation with `npm list pdfkit qrcode @aws-sdk/client-s3`. Update backend/package.json scripts if needed for TypeScript build process.

### 47.2. Create Cloudflare R2 storage utility module following existing lib patterns

**Status:** pending  
**Dependencies:** 47.1  

Build a reusable R2 storage client utility in backend/src/lib/r2-storage.ts with upload and retrieve functions, following the pattern established by existing lib modules

**Details:**

Create backend/src/lib/r2-storage.ts. Import S3Client, PutObjectCommand, GetObjectCommand from @aws-sdk/client-s3. Create and export S3Client instance configured with: endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region: 'auto', credentials from CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY. Export async uploadPDF(buffer: Buffer, key: string) function that uses PutObjectCommand with Bucket from env, Key, Body buffer, ContentType 'application/pdf'. Return constructed public URL using CLOUDFLARE_R2_PUBLIC_URL. Add error handling similar to redis.ts pattern. Include reconnection logic and console logging for errors.

### 47.3. Implement PDF generation service with QR code embedding

**Status:** pending  
**Dependencies:** 47.1  

Create backend/src/lib/pdf-generator.ts module that generates certificate PDFs with MEA branding, student info, course details, and embedded QR code

**Details:**

Create backend/src/lib/pdf-generator.ts. Import PDFDocument from pdfkit, qrcode. Export async function generateCertificadoPDF(data: {codigo: string, alumnoNombre: string, cursoNombre: string, fechaEmision: Date}): Promise<Buffer>. Generate QR code PNG using qrcode.toDataURL(`https://www.mea.edu.gt/verify/${codigo}`). Create new PDFDocument. Load MEA logo from public/mea logo.svg (convert path to absolute using process.cwd()). Set page size A4 landscape. Add logo at top center. Use font 'Helvetica-Bold' 24pt for title 'Certificado de Finalización'. Add alumnoNombre in 18pt. Add 'Ha completado exitosamente el curso:' followed by cursoNombre. Add fechaEmision formatted as 'DD de MMMM de YYYY'. Embed QR code image at bottom right (150x150px). Add footer text 'Verificar en mea.edu.gt/verify'. Pipe PDFDocument to buffer array, return concatenated Buffer. Handle errors and ensure stream cleanup.

### 47.4. Create backend/src/routes/certificados.ts with POST /api/certificados endpoint

**Status:** pending  
**Dependencies:** 47.2, 47.3  

Implement certificate creation route that verifies completed enrollment, generates certificate PDF with QR code, uploads to R2, and saves record to database

**Details:**

Create backend/src/routes/certificados.ts following the pattern from cursos.ts. Import Router, prisma, verifyJWT, crypto, generateCertificadoPDF from lib/pdf-generator, uploadPDF from lib/r2-storage. Create router = Router(). Implement POST '/' with verifyJWT middleware. Extract {inscripcionId} from req.body (validate as number). Query Prisma for inscripcion (with relations: alumno, curso) where id=inscripcionId. Verify inscripcion.estado === 'COMPLETADA', return 400 'Inscripción no completada' if not. Generate codigo = crypto.randomBytes(8).toString('hex'). Call generateCertificadoPDF({codigo, alumnoNombre: inscripcion.alumno.nombre, cursoNombre: inscripcion.curso.nombre, fechaEmision: new Date()}). Call uploadPDF(pdfBuffer, `certificados/${codigo}.pdf`) to get urlPdf. Create Certificado record in Prisma with: codigo, inscripcionId, alumnoId, cursoId, urlPdf, fechaEmision. Return 201 with certificado JSON. Add try-catch for errors, return 500 on failure. Export default router.

### 47.5. Implement GET /api/certificados and GET /api/certificados/verify/:codigo with Redis caching

**Status:** pending  
**Dependencies:** 47.4  

Create list endpoint with alumnoId filter and public verification endpoint with 24h Redis cache for certificate validation

**Details:**

In backend/src/routes/certificados.ts, implement GET '/' with verifyJWT. Accept query param alumnoId (optional number). Query Prisma Certificado with where clause {alumnoId} if provided, include relations alumno, curso. Return JSON array. Implement GET '/verify/:codigo' WITHOUT verifyJWT (public endpoint). Extract codigo from params. Check Redis cache key `cert:${codigo}` using getJSON from lib/redis. If cached, return immediately. If not cached, query Prisma Certificado where codigo, include alumno, curso. If not found, return 404 {valid: false}. If found, construct response {valid: true, alumno: {nombre, email}, curso: {nombre}, fecha: fechaEmision}. Cache response in Redis with key `cert:${codigo}` and TTL 86400 (24h) using setJSON. Return response. Add to backend/src/index.ts: import certificadosRouter from './routes/certificados'; app.use('/api/certificados', certificadosRouter). Follow error handling patterns from cursos.ts.
