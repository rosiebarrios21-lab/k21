import type { NextFunction, Request, Response } from "express";
import type { Rol } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { noAutorizado, prohibido } from "../lib/errores.js";
import { verificarToken, type Sesion } from "../lib/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sesion?: Sesion;
    }
  }
}

/** Exige un token válido de un usuario activo. El rol se relee de la base (puede haber cambiado). */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const [esquema, token] = (req.headers.authorization ?? "").split(" ");
  if (esquema !== "Bearer" || !token) throw noAutorizado();
  let sesion: Sesion;
  try {
    sesion = await verificarToken(token);
  } catch {
    throw noAutorizado();
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.id } });
  if (!usuario?.activo) throw noAutorizado();
  req.sesion = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre };
  next();
}

export function permitir(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.sesion || !roles.includes(req.sesion.rol)) throw prohibido();
    next();
  };
}

export function sesionDe(req: Request): Sesion {
  if (!req.sesion) throw noAutorizado();
  return req.sesion;
}
