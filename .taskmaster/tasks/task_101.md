# Task ID: 101

**Title:** Crear helper compartido storage.ts para subir archivos a R2

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Generalizar la lógica de S3Client y PutObjectCommand en un helper reutilizable para certificados y audios

**Details:**

Crear `backend/src/lib/storage.ts`. Exportar `subirArchivoR2(key: string, buffer: Buffer, contentType: string): Promise<string | undefined>` que reutilice `getS3Client()` de `certificado-pdf.ts` (moverlo a storage.ts), valide las env vars (R2_ACCOUNT_ID, ACCESS_KEY, SECRET_KEY, BUCKET, PUBLIC_URL), ejecute `PutObjectCommand`, retorne la URL pública o undefined si falla/no configurado. Loguear con `log('info', '[R2] Archivo subido: {url}')` y `log('warn', '[R2] No configurado — archivo no subido')`. Modificar `certificado-pdf.ts` para importar y usar `subirArchivoR2('certificados/{codigo}.pdf', buffer, 'application/pdf')` en vez de duplicar el código.

**Test Strategy:**

Prueba unitaria con mock de S3Client: verificar que llame a PutObjectCommand con los parámetros correctos y retorne la URL esperada. Prueba de integración local (si R2 está configurado): subir un archivo de prueba y verificar que la URL pública funcione. Prueba de degradación: sin env vars, verificar que retorne undefined y loguee warning sin lanzar error.
