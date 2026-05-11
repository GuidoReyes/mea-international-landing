import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import redisClient, { getJSON, setJSON, COURSE_CACHE_TTL } from "../lib/redis";

const router = Router();
const CACHE_KEY = "cursos:all";

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

router.post("/", async (req: Request, res: Response) => {
  const { nombre, descripcion, precio, modalidad, duracion } = req.body as {
    nombre?: string;
    descripcion?: string;
    precio?: number;
    modalidad?: string;
    duracion?: string;
  };

  if (!nombre || !descripcion || precio === undefined || !modalidad || !duracion) {
    res.status(400).json({ error: "Faltan campos requeridos: nombre, descripcion, precio, modalidad, duracion" });
    return;
  }

  const curso = await prisma.curso.create({
    data: { nombre, descripcion, precio, modalidad, duracion },
  });

  await invalidateCache();
  res.status(201).json(curso);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { nombre, descripcion, precio, modalidad, duracion, activo } = req.body as {
    nombre?: string;
    descripcion?: string;
    precio?: number;
    modalidad?: string;
    duracion?: string;
    activo?: boolean;
  };

  const curso = await prisma.curso.update({
    where: { id },
    data: { nombre, descripcion, precio, modalidad, duracion, activo },
  });

  await invalidateCache();
  res.json(curso);
});

router.delete("/:id", async (req: Request, res: Response) => {
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
