import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { invalido } from "../lib/errores.js";

/** Valida y reemplaza req.body (o req.query en `validarQuery`) por el resultado parseado. */
export function validar(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) throw invalido("Datos inválidos", z.flattenError(r.error));
    req.body = r.data;
    next();
  };
}
