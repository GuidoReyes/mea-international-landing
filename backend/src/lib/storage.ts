import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./certificado-pdf";
import { log } from "./logger";

// Sube un archivo genérico a R2 y devuelve la URL pública, o undefined si R2
// no está configurado o falla (mismo patrón tolerante que subirCertificadoPdf).
export async function subirArchivoR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string | undefined> {
  const s3 = getS3Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!s3 || !bucket || !publicUrl) {
    log("warn", `[Storage] R2 no configurado — no se subió ${key}`);
    return undefined;
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    const url = `${publicUrl}/${key}`;
    log("info", `[Storage] Archivo subido a R2: ${url}`);
    return url;
  } catch (err) {
    log("error", `[Storage] Error subiendo ${key} a R2:`, err);
    return undefined;
  }
}
