import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { getJSON, setJSON } from "../lib/redis";
import { log } from "../lib/logger";
import { generateCertificadoPdf, subirCertificadoPdf } from "../lib/certificado-pdf";

const router = Router();

const CERT_CACHE_TTL = 86400; // 24h

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
    subtitulo: inscripcion.edicion.nombre,
    fechaEmision: new Date(),
    codigo,
    verifyUrl,
  });

  const urlPdf = await subirCertificadoPdf(codigo, pdfBuffer);

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
