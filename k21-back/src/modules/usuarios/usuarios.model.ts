import type { Usuario } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export function usuarioPublico(u: Usuario) {
  return { id: u.id, usuario: u.usuario, nombre: u.nombre, codigo: u.codigo, rol: u.rol, activo: u.activo };
}

export const listar = () => prisma.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] });
export const obtener = (id: string) => prisma.usuario.findUnique({ where: { id } });
