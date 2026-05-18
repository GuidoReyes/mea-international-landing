import { Router, Request, Response } from "express";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { getJSON, setJSON } from "../lib/redis";
import { log } from "../lib/logger";

const router = Router();

const CERT_CACHE_TTL = 86400; // 24h

function getS3Client(): S3Client | null {
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

async function generateCertificadoPdf(data: {
  alumnoNombre: string;
  cursoNombre: string;
  edicionNombre: string;
  fechaEmision: Date;
  codigo: string;
  verifyUrl: string;
}): Promise<Buffer> {
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
      .text(data.edicionNombre, { align: "center" });

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

// POST /api/certificados — emitir certificado
router.post("/", verifyJWT, async (req: Request, res: Response) => {
  const { inscripcionId } = req.body as { inscripcionId?: number };
  if (!inscripcionId) {
    res.status(400).json({ error: "inscripcionId requerido" });
    return;
  }

  const inscripcion = await prisma.inscripcion.findUnique({
    where: { id: inscripcionId },
    include: {
      alumno: true,
      edicion: { include: { curso: true } },
    },
  });

  if (!inscripcion) {
    res.status(404).json({ error: "Inscripción no encontrada" });
    return;
  }
  if (inscripcion.estado !== "COMPLETADA") {
    res.status(400).json({ error: "La inscripción debe estar COMPLETADA para emitir certificado" });
    return;
  }

  const existing = await prisma.certificado.findUnique({ where: { inscripcionId } });
  if (existing) {
    res.status(409).json({ error: "Ya existe un certificado para esta inscripción", certificado: existing });
    return;
  }

  const codigo = crypto.randomBytes(8).toString("hex");
  const baseUrl = process.env.FRONTEND_URL ?? "https://www.mea.edu.gt";
  const verifyUrl = `${baseUrl}/verify/${codigo}`;

  const pdfBuffer = await generateCertificadoPdf({
    alumnoNombre: `${inscripcion.alumno.nombre} ${inscripcion.alumno.apellido}`,
    cursoNombre: inscripcion.edicion.curso.nombre,
    edicionNombre: inscripcion.edicion.nombre,
    fechaEmision: new Date(),
    codigo,
    verifyUrl,
  });

  let urlPdf: string | undefined;
  const s3 = getS3Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (s3 && bucket && publicUrl) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `certificados/${codigo}.pdf`,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      }));
      urlPdf = `${publicUrl}/certificados/${codigo}.pdf`;
      log("info", `[Certificados] PDF subido a R2: ${urlPdf}`);
    } catch (err) {
      log("error", "[Certificados] Error subiendo a R2:", err);
    }
  } else {
    log("warn", "[Certificados] R2 no configurado — certificado sin URL de PDF");
  }

  const certificado = await prisma.certificado.create({
    data: {
      inscripcionId,
      alumnoId: inscripcion.alumnoId,
      codigo,
      urlPdf: urlPdf ?? null,
      fechaEmision: new Date(),
    },
  });

  log("info", `[Certificados] Emitido: ${codigo} para alumno ${inscripcion.alumnoId}`);

  if (!urlPdf) {
    // Si no hay R2, devolver el PDF directamente
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=certificado-${codigo}.pdf`);
    res.send(pdfBuffer);
    return;
  }

  res.status(201).json(certificado);
});

// GET /api/certificados — listar (admin)
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const alumnoId = req.query.alumnoId ? parseInt(req.query.alumnoId as string) : undefined;
  const certificados = await prisma.certificado.findMany({
    where: alumnoId ? { alumnoId } : {},
    include: {
      alumno: { select: { nombre: true, apellido: true, carnet: true } },
      inscripcion: { include: { edicion: { include: { curso: { select: { nombre: true } } } } } },
    },
    orderBy: { fechaEmision: "desc" },
  });
  res.json(certificados);
});

// GET /api/certificados/verify/:codigo — público, sin JWT
router.get("/verify/:codigo", async (req: Request, res: Response) => {
  const { codigo } = req.params as { codigo: string };

  const cacheKey = `cert:${codigo}`;
  const cached = await getJSON<object>(cacheKey).catch(() => null);
  if (cached) {
    res.json(cached);
    return;
  }

  const cert = await prisma.certificado.findUnique({
    where: { codigo },
    include: {
      alumno: { select: { nombre: true, apellido: true } },
      inscripcion: {
        include: {
          edicion: { include: { curso: { select: { nombre: true } } } },
        },
      },
    },
  });

  if (!cert || cert.revocado) {
    res.status(404).json({ valid: false });
    return;
  }

  const result = {
    valid: true,
    alumno: `${cert.alumno.nombre} ${cert.alumno.apellido}`,
    curso: cert.inscripcion.edicion.curso.nombre,
    edicion: cert.inscripcion.edicion.nombre,
    fecha: cert.fechaEmision,
    codigo: cert.codigo,
    urlPdf: cert.urlPdf,
  };

  await setJSON(cacheKey, result, CERT_CACHE_TTL).catch(() => {});
  res.json(result);
});

export default router;
