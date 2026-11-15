/**
 * Carga (o actualiza) las planillas, el móvil AM21 y el administrador inicial. Idempotente:
 * se puede correr varias veces; no pisa contraseñas ni datos de controles existentes.
 */
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { CATALOGO_MATERIAL, CATALOGO_MECANICO } from "../lib/catalogo.js";
import { hashearContrasenha } from "../lib/contrasenha.js";

async function cargarCatalogo(tipoControl: "MECANICO" | "MATERIAL", catalogo: typeof CATALOGO_MECANICO) {
  for (const [i, s] of catalogo.entries()) {
    const seccion = await prisma.seccion.upsert({
      where: { tipoControl_nombre: { tipoControl, nombre: s.nombre } },
      create: { tipoControl, nombre: s.nombre, orden: i + 1, tipoRespuesta: s.tipoRespuesta, nota: s.nota ?? null },
      update: { orden: i + 1, tipoRespuesta: s.tipoRespuesta, nota: s.nota ?? null },
    });
    for (const [j, it] of s.items.entries()) {
      const item = typeof it === "string" ? { nombre: it } : it;
      const datos = {
        orden: j + 1,
        debeHaber: item.debeHaber ?? null,
        unidad: item.unidad ?? null,
        invertido: item.invertido ?? false,
      };
      await prisma.item.upsert({
        where: { seccionId_nombre: { seccionId: seccion.id, nombre: item.nombre } },
        create: { seccionId: seccion.id, nombre: item.nombre, ...datos },
        update: datos,
      });
    }
  }
}

await cargarCatalogo("MECANICO", CATALOGO_MECANICO);
await cargarCatalogo("MATERIAL", CATALOGO_MATERIAL);

await prisma.movil.upsert({
  where: { codigo: "AM21" },
  create: { codigo: "AM21", descripcion: "Ambulancia" },
  update: {},
});

const admin = await prisma.usuario.findUnique({ where: { usuario: env.ADMIN_USUARIO } });
if (!admin) {
  await prisma.usuario.create({
    data: {
      usuario: env.ADMIN_USUARIO,
      nombre: "Administrador",
      rol: "ADMIN",
      contrasenhaHash: await hashearContrasenha(env.ADMIN_CONTRASENHA),
    },
  });
  console.log(`Administrador "${env.ADMIN_USUARIO}" creado. Cambiá la contraseña al ingresar.`);
}

console.log("Seed completo.");
await prisma.$disconnect();
