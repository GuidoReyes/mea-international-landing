import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { log } from "./logger";

// Extraído de routes/certificados.ts para compartirlo con los certificados online.

export function getS3Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
  if (!accountId || !accessKey || !secretKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

export interface CertificadoPdfData {
  alumnoNombre: string;
  cursoNombre: string;
  subtitulo: string; // nombre de edición (cohortes) o etiqueta del curso online
  fechaEmision: Date;
  codigo: string;
  verifyUrl: string;
}

export async function generateCertificadoPdf(data: CertificadoPdfData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, { width: 120, margin: 1 });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrBase64, "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Fondo decorativo
    doc.rect(0, 0, doc.page.width, 12).fill("#0A2540");
    doc.rect(0, doc.page.height - 12, doc.page.width, 12).fill("#0A2540");

    // Encabezado
    doc.moveDown(1);
    doc.fontSize(10).fillColor("#64748b").font("Helvetica")
      .text("MEA INTERNATIONAL", { align: "center", characterSpacing: 4 });

    doc.moveDown(0.5);
    doc.fontSize(28).fillColor("#0A2540").font("Helvetica-Bold")
      .text("Certificado de Finalización", { align: "center" });

    doc.moveDown(0.4);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor("#00C4B4").lineWidth(2).stroke();

    doc.moveDown(1.5);
    doc.fontSize(12).fillColor("#64748b").font("Helvetica")
      .text("Se certifica que", { align: "center" });

    doc.moveDown(0.6);
    doc.fontSize(26).fillColor("#0A2540").font("Helvetica-Bold")
      .text(data.alumnoNombre, { align: "center" });

    doc.moveDown(0.6);
    doc.fontSize(12).fillColor("#64748b").font("Helvetica")
      .text("ha completado satisfactoriamente el curso", { align: "center" });

    doc.moveDown(0.6);
    doc.fontSize(18).fillColor("#00C4B4").font("Helvetica-Bold")
      .text(data.cursoNombre, { align: "center" });

    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#94a3b8").font("Helvetica")
      .text(data.subtitulo, { align: "center" });

    doc.moveDown(1.5);
    const fechaStr = data.fechaEmision.toLocaleDateString("es-GT", {
      day: "2-digit", month: "long", year: "numeric",
    });
    doc.fontSize(11).fillColor("#64748b").font("Helvetica")
      .text(`Emitido el ${fechaStr}`, { align: "center" });

    // QR code
    const qrX = doc.page.width / 2 - 45;
    doc.moveDown(1.5);
    doc.image(qrBuffer, qrX, doc.y, { width: 90 });
    doc.moveDown(0.3).y += 90;

    doc.fontSize(8).fillColor("#94a3b8").font("Helvetica")
      .text(`Código de verificación: ${data.codigo}`, { align: "center" });
    doc.fontSize(8).fillColor("#94a3b8")
      .text(data.verifyUrl, { align: "center" });

    doc.end();
  });
}

// Sube el PDF a R2 y devuelve la URL pública, o undefined si R2 no está configurado o falla.
export async function subirCertificadoPdf(codigo: string, pdfBuffer: Buffer): Promise<string | undefined> {
  const s3 = getS3Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!s3 || !bucket || !publicUrl) {
    log("warn", "[Certificados] R2 no configurado — certificado sin URL de PDF");
    return undefined;
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `certificados/${codigo}.pdf`,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }));
    const url = `${publicUrl}/certificados/${codigo}.pdf`;
    log("info", `[Certificados] PDF subido a R2: ${url}`);
    return url;
  } catch (err) {
    log("error", "[Certificados] Error subiendo a R2:", err);
    return undefined;
  }
}
