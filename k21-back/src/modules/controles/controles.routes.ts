import { Router, type Request, type Response } from "express";
import { invalido } from "../../lib/errores.js";
import { ok } from "../../lib/response.js";
import { autenticar, permitir, sesionDe } from "../../middlewares/auth.js";
import { validar } from "../../middlewares/validate.js";
import { z } from "zod";
import { filtrosSchema, guardarControlSchema, revisionSchema } from "./controles.schema.js";
import * as servicio from "./controles.service.js";

export const controlesRouter = Router();
controlesRouter.use(autenticar);

controlesRouter.get("/resumen", async (req: Request, res: Response) => {
  ok(res, await servicio.resumen(sesionDe(req)));
});

controlesRouter.get("/", async (req: Request, res: Response) => {
  const filtros = filtrosSchema.safeParse(req.query);
  if (!filtros.success) throw invalido("Filtros inválidos", z.flattenError(filtros.error));
  ok(res, await servicio.listar(sesionDe(req), filtros.data));
});

controlesRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  ok(res, await servicio.obtener(sesionDe(req), req.params.id));
});

controlesRouter.post("/", validar(guardarControlSchema), async (req: Request, res: Response) => {
  ok(res, await servicio.crear(sesionDe(req), req.body), 201);
});

controlesRouter.put("/:id", validar(guardarControlSchema), async (req: Request<{ id: string }>, res: Response) => {
  ok(res, await servicio.actualizar(sesionDe(req), req.params.id, req.body));
});

controlesRouter.post(
  "/:id/revision",
  permitir("ADMIN"),
  validar(revisionSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    ok(res, await servicio.revisar(sesionDe(req), req.params.id, req.body));
  },
);
