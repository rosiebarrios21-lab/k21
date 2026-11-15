import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { manejarErrores } from "./middlewares/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { controlesRouter } from "./modules/controles/controles.routes.js";
import { movilesRouter } from "./modules/moviles/moviles.js";
import { plantillasRouter } from "./modules/plantillas/plantillas.js";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes.js";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "200kb" }));

const api = Router();
api.get("/salud", (_req, res) => {
  res.json({ ok: true });
});
api.use("/auth", authRouter);
api.use("/usuarios", usuariosRouter);
api.use("/moviles", movilesRouter);
api.use("/plantillas", plantillasRouter);
api.use("/controles", controlesRouter);

app.use("/api/v1", api);
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "Ruta inexistente" } });
});
app.use(manejarErrores);
