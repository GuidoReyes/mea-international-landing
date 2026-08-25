import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();

// GET /api/reportes-leccion — log de reportes de "algo funciona mal" por lección,
// para que el equipo los revise y corrija. Filtrable por resuelto.
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  const { resuelto } = req.query as { resuelto?: string };

  const reportes = await prisma.reporteLeccion.findMany({
    where: resuelto !== undefined ? { resuelto: resuelto === "true" } : {},
    orderBy: { creadoEn: "desc" },
    include: {
      leccion: { select: { id: true, titulo: true } },
      alumno: { select: { nombre: true, apellido: true, email: true, whatsapp: true, carnet: true } },
    },
  });

  res.json(
    reportes.map((r) => ({
      id: r.id,
      mensaje: r.mensaje,
      resuelto: r.resuelto,
      creadoEn: r.creadoEn,
      leccion: r.leccion,
      alumno: r.alumno,
    }))
  );
});

// PATCH /api/reportes-leccion/:id/resolver — marca el reporte como revisado/corregido.
router.patch(
  "/:id/resolver",
  verifyJWT,
  auditLog("RESOLVER_REPORTE_LECCION", "reportes-leccion"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const reporte = await prisma.reporteLeccion.findUnique({ where: { id } });
    if (!reporte) {
      res.status(404).json({ error: "Reporte no encontrado" });
      return;
    }

    const actualizado = await prisma.reporteLeccion.update({
      where: { id },
      data: { resuelto: true },
    });

    res.json({ ok: true, resuelto: actualizado.resuelto });
  }
);

export default router;
