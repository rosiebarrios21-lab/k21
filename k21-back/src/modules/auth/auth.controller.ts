import type { Request, Response } from "express";
import { ok } from "../../lib/response.js";
import { sesionDe } from "../../middlewares/auth.js";
import * as servicio from "./auth.service.js";

export async function login(req: Request, res: Response) {
  ok(res, await servicio.login(req.body.usuario, req.body.contrasenha));
}

export async function yo(req: Request, res: Response) {
  ok(res, await servicio.yo(sesionDe(req).id));
}

export async function cambiarContrasenha(req: Request, res: Response) {
  await servicio.cambiarContrasenha(sesionDe(req).id, req.body.actual, req.body.nueva);
  ok(res, null);
}
