import type { Request, Response } from "express";
import { ok } from "../../lib/response.js";
import { sesionDe } from "../../middlewares/auth.js";
import * as servicio from "./usuarios.service.js";

export async function listar(_req: Request, res: Response) {
  ok(res, await servicio.listar());
}

export async function crear(req: Request, res: Response) {
  ok(res, await servicio.crear(req.body), 201);
}

export async function actualizar(req: Request<{ id: string }>, res: Response) {
  ok(res, await servicio.actualizar(req.params.id, sesionDe(req).id, req.body));
}
