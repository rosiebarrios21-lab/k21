import { Router } from "express";
import { autenticar, permitir } from "../../middlewares/auth.js";
import { validar } from "../../middlewares/validate.js";
import * as c from "./usuarios.controller.js";
import { actualizarUsuarioSchema, crearUsuarioSchema } from "./usuarios.schema.js";

export const usuariosRouter = Router();
usuariosRouter.use(autenticar, permitir("ADMIN"));
usuariosRouter.get("/", c.listar);
usuariosRouter.post("/", validar(crearUsuarioSchema), c.crear);
usuariosRouter.patch("/:id", validar(actualizarUsuarioSchema), c.actualizar);
