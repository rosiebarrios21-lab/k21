// Móviles: listado para todos; alta y edición solo para el admin. Módulo chico: un solo archivo.
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { noEncontrado } from "../../lib/errores.js";
import { ok } from "../../lib/response.js";
import { autenticar, permitir, sesionDe } from "../../middlewares/auth.js";
import { validar } from "../../middlewares/validate.js";

const crearMovilSchema = z.object({
  codigo: z.string().trim().toUpperCase().min(1).max(20),
  descripcion: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null)
    .nullish(),
});
const actualizarMovilSchema = crearMovilSchema.partial().extend({ activo: z.boolean().optional() });

export const movilesRouter = Router();
movilesRouter.use(autenticar);

movilesRouter.get("/", async (req: Request, res: Response) => {
  // Choferes y respondientes solo ven los móviles activos.
  const todos = sesionDe(req).rol === "ADMIN" && req.query["todos"] === "1";
  ok(
    res,
    await prisma.movil.findMany({ where: todos ? {} : { activo: true }, orderBy: { codigo: "asc" } }),
  );
});

movilesRouter.post("/", permitir("ADMIN"), validar(crearMovilSchema), async (req: Request, res: Response) => {
  const datos = req.body as z.infer<typeof crearMovilSchema>;
  ok(res, await prisma.movil.create({ data: { codigo: datos.codigo, descripcion: datos.descripcion ?? null } }), 201);
});

movilesRouter.patch(
  "/:id",
  permitir("ADMIN"),
  validar(actualizarMovilSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    if (!(await prisma.movil.findUnique({ where: { id: req.params.id } }))) throw noEncontrado("Móvil no encontrado");
    ok(res, await prisma.movil.update({ where: { id: req.params.id }, data: req.body }));
  },
);
