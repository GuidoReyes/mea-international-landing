# Task ID: 86

**Title:** Implementar generación automática de certificados online

**Status:** done

**Dependencies:** 85 ✓

**Priority:** high

**Description:** Generar certificados PDF con QR cuando el alumno completa un curso con promedio >= 85

**Details:**

Crear helper `generateCertificadoOnline` en `backend/src/routes/certificados.ts`:

1. Verificar que NO existe certificado (unique alumnoId+cursoOnlineId)
2. Generar código único con `crypto.randomBytes(8).toString('hex')`
3. Calcular puntaje promedio de todas las lecciones completadas
4. Crear `CertificadoOnline` en DB con puntaje
5. Reutilizar `generateCertificadoPdf` del mismo archivo adaptando datos:
   - alumnoNombre: `${alumno.nombre} ${alumno.apellido}`
   - cursoNombre: `curso.titulo`
   - edicionNombre: `"Curso Online"` (no hay ediciones en cursos online)
   - fechaEmision: `new Date()`
   - codigo: generado
   - verifyUrl: `${FRONTEND_URL}/verify-online/${codigo}`
6. Subir PDF a S3/R2 usando patrón existente (`getS3Client`, `PutObjectCommand`)
7. Actualizar `CertificadoOnline.urlPdf` con la URL pública
8. Responder con certificado creado

Crear endpoint público:
`GET /api/certificados-online/:cursoOnlineId` (auth alumno requerido):
- Buscar certificado por alumnoId y cursoOnlineId
- Si no existe, 404
- Si existe, devolver JSON o stream PDF

Tecnologías: pdfkit, qrcode, @aws-sdk/client-s3, crypto

**Test Strategy:**

Integration tests:
- Certificado se genera solo si promedio >= 85
- Certificado con promedio < 85 no se genera
- Certificado idempotente (no duplica si ya existe)
- PDF contiene QR válido
- S3 upload exitoso actualiza urlPdf
- GET certificado sin auth retorna 401
- GET certificado inexistente retorna 404
