import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errores.js";

export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      ok: false,
      error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles },
    });
  }
  if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
    return res.status(409).json({ ok: false, error: { codigo: "CONFLICTO", mensaje: "El registro ya existe" } });
  }
  console.error(err);
  return res.status(500).json({ ok: false, error: { codigo: "ERROR_INTERNO", mensaje: "Error interno" } });
}
