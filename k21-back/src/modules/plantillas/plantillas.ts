// Plantillas (secciones + ítems) de cada tipo de control. El admin puede ajustar ítems.
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { invalido, noEncontrado } from "../../lib/errores.js";
import { ok } from "../../lib/response.js";
import { autenticar, permitir } from "../../middlewares/auth.js";
import { validar } from "../../middlewares/validate.js";
import type { TipoControl } from "../../generated/prisma/client.js";

export function obtenerPlantilla(tipo: TipoControl, incluirInactivos = false) {
  return prisma.seccion.findMany({
    where: { tipoControl: tipo },
    orderBy: { orden: "asc" },
    include: {
      items: { where: incluirInactivos ? {} : { activo: true }, orderBy: { orden: "asc" } },
    },
  });
}

const itemSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  debeHaber: z.number().int().min(0).nullish(),
  unidad: z
    .string()
    .trim()
    .max(20)
    .transform((v) => v || null)
    .nullish(),
  invertido: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export const plantillasRouter = Router();
plantillasRouter.use(autenticar);

plantillasRouter.get("/:tipo", async (req: Request<{ tipo: string }>, res: Response) => {
  const tipo = req.params.tipo.toUpperCase();
  if (tipo !== "MECANICO" && tipo !== "MATERIAL") throw invalido("Tipo de control inválido");
  const todos = req.sesion?.rol === "ADMIN" && req.query["todos"] === "1";
  ok(res, await obtenerPlantilla(tipo, todos));
});

plantillasRouter.post(
  "/secciones/:id/items",
  permitir("ADMIN"),
  validar(itemSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const seccion = await prisma.seccion.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!seccion) throw noEncontrado("Sección no encontrada");
    const datos = req.body as z.infer<typeof itemSchema>;
    const orden = Math.max(0, ...seccion.items.map((i) => i.orden)) + 1;
    ok(
      res,
      await prisma.item.create({
        data: {
          seccionId: seccion.id,
          nombre: datos.nombre,
          orden,
          debeHaber: datos.debeHaber ?? null,
          unidad: datos.unidad ?? null,
          invertido: datos.invertido ?? false,
        },
      }),
      201,
    );
  },
);

plantillasRouter.patch(
  "/items/:id",
  permitir("ADMIN"),
  validar(itemSchema.partial()),
  async (req: Request<{ id: string }>, res: Response) => {
    if (!(await prisma.item.findUnique({ where: { id: req.params.id } }))) throw noEncontrado("Ítem no encontrado");
    ok(res, await prisma.item.update({ where: { id: req.params.id }, data: req.body }));
  },
);
