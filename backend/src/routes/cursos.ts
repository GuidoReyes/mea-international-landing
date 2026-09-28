import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import redisClient, { getJSON, setJSON, COURSE_CACHE_TTL } from "../lib/redis";
import { verifyJWT } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

const router = Router();
const CACHE_KEY = "cursos:all";

// vuln_027: nombre/descripcion/precio/modalidad/duracion solo se chequeaban con
// `!campo` (rechaza vacío, pero no tipo ni rango) — precio negativo o un string
// numérico ("100") pasaban derecho a Prisma.
const cursoBaseSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().min(1),
  precio: z.number().positive(),
  modalidad: z.string().min(1),
  duracion: z.string().min(1),
});
export const createCursoSchema = cursoBaseSchema;
export const updateCursoSchema = cursoBaseSchema.partial().extend({ activo: z.boolean().optional() });

async function invalidateCache() {
  try { await redisClient.del(CACHE_KEY); } catch { /* Redis unavailable, skip */ }
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const cached = await getJSON<unknown[]>(CACHE_KEY);
    if (cached) { res.json(cached); return; }
  } catch { /* Redis unavailable, fall through to DB */ }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip = (page - 1) * limit;

  const cursos = await prisma.curso.findMany({
    where: { activo: true },
    skip,
    take: limit,
    orderBy: { creadoEn: "desc" },
  });

  try { await setJSON(CACHE_KEY, cursos, COURSE_CACHE_TTL); } catch { /* Redis unavailable, skip */ }
  res.json(cursos);
});

router.post("/", verifyJWT, auditLog("CREAR_CURSO", "cursos"), async (req: Request, res: Response) => {
  const parsed = createCursoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }

  const curso = await prisma.curso.create({ data: parsed.data });

  await invalidateCache();
  res.status(201).json(curso);
});

router.patch("/:id", verifyJWT, auditLog("ACTUALIZAR_CURSO", "cursos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = updateCursoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }

  const curso = await prisma.curso.update({
    where: { id },
    data: parsed.data,
  });

  await invalidateCache();
  res.json(curso);
});

router.delete("/:id", verifyJWT, auditLog("ELIMINAR_CURSO", "cursos"), async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await prisma.curso.update({ where: { id }, data: { activo: false } });
  await invalidateCache();
  res.status(204).send();
});

export default router;
