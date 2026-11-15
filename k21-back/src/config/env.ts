import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3100),
  DATABASE_URL: z.url(),
  // Supabase: SSL obligatorio. Ruta opcional al certificado CA para verificar el servidor.
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  DATABASE_CA_CERT: z.string().optional(),
  // Conexiones por instancia: el pooler de Supabase ya reparte las conexiones reales.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  CORS_ORIGIN: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRACION: z.string().default("12h"),
  ADMIN_USUARIO: z.string().min(1).default("admin"),
  ADMIN_CONTRASENHA: z.string().min(6).default("cambiar123"),
});

const resultado = envSchema.safeParse(process.env);
if (!resultado.success) {
  console.error("Variables de entorno inválidas:", z.prettifyError(resultado.error));
  process.exit(1);
}

export const env = resultado.data;
