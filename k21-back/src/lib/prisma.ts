import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// Supabase exige SSL. Con DATABASE_CA_CERT (el certificado que se descarga en Project Settings →
// Database → SSL) se verifica el servidor; sin él, la conexión va cifrada pero sin verificar.
function ssl() {
  if (!env.DATABASE_SSL) return undefined;
  if (env.DATABASE_CA_CERT) return { ca: readFileSync(env.DATABASE_CA_CERT, "utf8"), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

// Sin sslmode en la URL: el SSL lo define `ssl()` (pg da prioridad a sslmode si viene en la URL).
const url = new URL(env.DATABASE_URL);
url.searchParams.delete("sslmode");

const adapter = new PrismaPg({ connectionString: url.toString(), ssl: ssl(), max: env.DATABASE_POOL_MAX });

export const prisma = new PrismaClient({ adapter });
