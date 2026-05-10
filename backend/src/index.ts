import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
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


app.listen(PORT, () => {
  console.log(`MEA Backend corriendo en puerto ${PORT}`);
});

export default app;
