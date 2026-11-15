import { z } from "zod";

export const loginSchema = z.object({
  usuario: z.string().trim().toLowerCase().min(1),
  contrasenha: z.string().min(1),
});

export const cambiarContrasenhaSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(6, "Mínimo 6 caracteres"),
});
