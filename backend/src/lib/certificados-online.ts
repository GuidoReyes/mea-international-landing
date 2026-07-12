import crypto from "crypto";
import { CertificadoOnline } from "@prisma/client";
import prisma from "./prisma";
import { log } from "./logger";
import { generateCertificadoPdf, subirCertificadoPdf } from "./certificado-pdf";

const PUNTAJE_MINIMO_CERTIFICADO = 85;

// Emite el certificado online si el alumno completó TODAS las lecciones del curso
// con promedio >= 85. Idempotente: si ya existe, lo devuelve sin regenerar.
export async function emitirCertificadoOnlineSiCorresponde(
  alumnoId: number,
  cursoOnlineId: number
): Promise<CertificadoOnline | null> {
  const existente = await prisma.certificadoOnline.findUnique({
    where: { alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId } },
  });
  if (existente) return existente;

  const lecciones = await prisma.leccion.findMany({
    where: { capitulo: { cursoOnlineId } },
    select: { id: true },
  });
  if (lecciones.length === 0) return null;

  const progreso = await prisma.progresoLeccion.findMany({
    where: {
      alumnoId,
      completada: true,
      leccionId: { in: lecciones.map((l) => l.id) },
    },
    select: { puntaje: true },
  });
  if (progreso.length < lecciones.length) return null;

  const promedio =
    progreso.reduce((suma, p) => suma + (p.puntaje ?? 0), 0) / progreso.length;
  if (promedio < PUNTAJE_MINIMO_CERTIFICADO) return null;

  const [alumno, curso] = await Promise.all([
    prisma.alumno.findUnique({ where: { id: alumnoId } }),
    prisma.cursoOnline.findUnique({ where: { id: cursoOnlineId } }),
  ]);
  if (!alumno || !curso) return null;

  const codigo = crypto.randomBytes(8).toString("hex");
  const baseUrl = process.env.FRONTEND_URL ?? "https://www.mea.edu.gt";
  const verifyUrl = `${baseUrl}/verify-online/${codigo}`;

  const pdfBuffer = await generateCertificadoPdf({
    alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
    cursoNombre: curso.titulo,
    subtitulo: "Curso online autoguiado",
    fechaEmision: new Date(),
    codigo,
    verifyUrl,
  });

  const urlPdf = await subirCertificadoPdf(codigo, pdfBuffer);

  try {
    const certificado = await prisma.certificadoOnline.create({
      data: {
        alumnoId,
        cursoOnlineId,
        codigo,
        puntaje: Math.round(promedio),
        urlPdf: urlPdf ?? null,
      },
    });
    log("info", `[CertificadosOnline] Emitido: ${codigo} para alumno ${alumnoId} (curso ${cursoOnlineId})`);
    return certificado;
  } catch {
    // Carrera con otra petición concurrente: el unique alumnoId+cursoOnlineId ya se creó
    return prisma.certificadoOnline.findUnique({
      where: { alumnoId_cursoOnlineId: { alumnoId, cursoOnlineId } },
    });
  }
}
