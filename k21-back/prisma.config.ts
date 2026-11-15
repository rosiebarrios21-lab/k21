import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migraciones: conexión directa o session pooler de Supabase (puerto 5432). El transaction
    // pooler (6543) que usa la app no sirve para migrar.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
