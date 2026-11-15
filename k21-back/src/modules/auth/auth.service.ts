import { prisma } from "../../lib/prisma.js";
import { hashearContrasenha, verificarContrasenha } from "../../lib/contrasenha.js";
import { invalido, noAutorizado, noEncontrado } from "../../lib/errores.js";
import { firmarToken } from "../../lib/tokens.js";
import { usuarioPublico } from "../usuarios/usuarios.model.js";

export async function login(usuario: string, contrasenha: string) {
  const u = await prisma.usuario.findUnique({ where: { usuario } });
  const valida = u ? await verificarContrasenha(contrasenha, u.contrasenhaHash) : false;
  if (!u || !valida || !u.activo) throw noAutorizado("Usuario o contraseña incorrectos");
  const token = await firmarToken({ id: u.id, rol: u.rol, nombre: u.nombre });
  return { token, usuario: usuarioPublico(u) };
}

export async function yo(id: string) {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) throw noEncontrado();
  return usuarioPublico(u);
}

export async function cambiarContrasenha(id: string, actual: string, nueva: string) {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) throw noEncontrado();
  if (!(await verificarContrasenha(actual, u.contrasenhaHash))) {
    throw invalido("La contraseña actual no es correcta");
  }
  await prisma.usuario.update({ where: { id }, data: { contrasenhaHash: await hashearContrasenha(nueva) } });
}
