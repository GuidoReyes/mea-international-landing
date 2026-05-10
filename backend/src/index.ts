import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(
  cors({
    origin: [process.env.FRONTEND_URL ?? "", "http://localhost:3000"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/tables", async (_req, res) => {
  try {
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name"
    );
    res.json({ tables: tables.map((r) => r.table_name) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`MEA Backend corriendo en puerto ${PORT}`);
});

export default app;
