import { Router } from "express";
import { autenticar } from "../../middlewares/auth.js";
import { validar } from "../../middlewares/validate.js";
import * as c from "./auth.controller.js";
import { cambiarContrasenhaSchema, loginSchema } from "./auth.schema.js";

export const authRouter = Router();
authRouter.post("/login", validar(loginSchema), c.login);
authRouter.get("/yo", autenticar, c.yo);
authRouter.post("/cambiar-contrasenha", autenticar, validar(cambiarContrasenhaSchema), c.cambiarContrasenha);
