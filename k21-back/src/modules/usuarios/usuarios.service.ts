import type { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { hashearContrasenha } from "../../lib/contrasenha.js";
import { invalido, noEncontrado } from "../../lib/errores.js";
import * as modelo from "./usuarios.model.js";
import type { actualizarUsuarioSchema, crearUsuarioSchema } from "./usuarios.schema.js";

export async function listar() {
  return (await modelo.listar()).map(modelo.usuarioPublico);
}

export async function crear(datos: z.infer<typeof crearUsuarioSchema>) {
  const { contrasenha, ...resto } = datos;
  const u = await prisma.usuario.create({
    data: { ...resto, codigo: resto.codigo ?? null, contrasenhaHash: await hashearContrasenha(contrasenha) },
  });
  return modelo.usuarioPublico(u);
}

export async function actualizar(id: string, idSesion: string, datos: z.infer<typeof actualizarUsuarioSchema>) {
  if (!(await modelo.obtener(id))) throw noEncontrado("Usuario no encontrado");
  if (id === idSesion && (datos.activo === false || (datos.rol && datos.rol !== "ADMIN"))) {
    throw invalido("No podés desactivarte ni quitarte el rol de administrador a vos mismo");
  }
  const { contrasenha, ...resto } = datos;
  const u = await prisma.usuario.update({
    where: { id },
    data: { ...resto, ...(contrasenha ? { contrasenhaHash: await hashearContrasenha(contrasenha) } : {}) },
  });
  return modelo.usuarioPublico(u);
}
