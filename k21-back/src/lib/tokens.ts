import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { Rol } from "../generated/prisma/client.js";

const clave = new TextEncoder().encode(env.JWT_SECRET);

export interface Sesion {
  id: string;
  rol: Rol;
  nombre: string;
}

export async function firmarToken(sesion: Sesion) {
  return new SignJWT({ rol: sesion.rol, nombre: sesion.nombre })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.id)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRACION)
    .sign(clave);
}

export async function verificarToken(token: string): Promise<Sesion> {
  const { payload } = await jwtVerify(token, clave, { algorithms: ["HS256"] });
  return { id: String(payload.sub), rol: payload["rol"] as Rol, nombre: String(payload["nombre"]) };
}
