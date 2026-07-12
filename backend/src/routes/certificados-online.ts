import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyAlumnoJWT } from "../middleware/alumno-auth.middleware";
import { getJSON, setJSON } from "../lib/redis";

const router = Router();

const CERT_CACHE_TTL = 86400; // 24h

// GET /api/certificados-online/verify/:codigo — público (QR del PDF)
router.get("/verify/:codigo", async (req: Request, res: Response) => {
  const { codigo } = req.params as { codigo: string };

  const cacheKey = `cert-online:${codigo}`;
  const cached = await getJSON<object>(cacheKey).catch(() => null);
  if (cached) {
    res.json(cached);
    return;
  }

  const cert = await prisma.certificadoOnline.findUnique({
    where: { codigo },
    include: {
      alumno: { select: { nombre: true, apellido: true } },
      cursoOnline: { select: { titulo: true } },
    },
  });

  if (!cert) {
    res.status(404).json({ valid: false });
    return;
  }

  const result = {
    valid: true,
    alumno: `${cert.alumno.nombre} ${cert.alumno.apellido}`,
    curso: cert.cursoOnline.titulo,
    puntaje: cert.puntaje,
    fecha: cert.emitidoEn,
    codigo: cert.codigo,
    urlPdf: cert.urlPdf,
  };

  await setJSON(cacheKey, result, CERT_CACHE_TTL).catch(() => {});
  res.json(result);
});

// GET /api/certificados-online/:cursoOnlineId — certificado del alumno autenticado
router.get("/:cursoOnlineId", verifyAlumnoJWT, async (req: Request, res: Response) => {
  const cursoOnlineId = parseInt(req.params["cursoOnlineId"] as string);
  if (isNaN(cursoOnlineId)) {
    res.status(400).json({ error: "ID de curso inválido" });
    return;
  }

  const cert = await prisma.certificadoOnline.findUnique({
    where: {
      alumnoId_cursoOnlineId: { alumnoId: req.alumno!.alumnoId, cursoOnlineId },
    },
    include: { cursoOnline: { select: { titulo: true, slug: true } } },
  });

  if (!cert) {
    res.status(404).json({ error: "Todavía no hay certificado para este curso" });
    return;
  }

  res.json({
    codigo: cert.codigo,
    puntaje: cert.puntaje,
    urlPdf: cert.urlPdf,
    emitidoEn: cert.emitidoEn,
    curso: cert.cursoOnline,
  });
});

export default router;
