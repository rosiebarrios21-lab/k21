import { z } from "zod";

const rol = z.enum(["ADMIN", "CHOFER", "RESPONDIENTE"]);
const codigo = z
  .string()
  .trim()
  .max(30)
  .transform((v) => v || null)
  .nullish();

export const crearUsuarioSchema = z.object({
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "De 3 a 30 letras, números, punto o guion"),
  nombre: z.string().trim().min(1).max(100),
  codigo,
  rol,
  contrasenha: z.string().min(6, "Mínimo 6 caracteres"),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  codigo,
  rol: rol.optional(),
  activo: z.boolean().optional(),
  contrasenha: z.string().min(6, "Mínimo 6 caracteres").optional(),
});
