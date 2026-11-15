import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Hash de contraseñas con scrypt (node:crypto), parámetros recomendados por OWASP.
 * Formato guardado: `scrypt$N$r$p$<salt base64>$<hash base64>`, autodescriptivo para poder
 * subir el costo en el futuro sin invalidar los hashes existentes.
 */
const ALGORITMO = "scrypt";
const COSTO = { N: 2 ** 17, r: 8, p: 1 };
const LARGO_SALT = 16;
const LARGO_HASH = 64;

function derivar(contrasenha: string, salt: Buffer, largo: number, opciones: ScryptOptions) {
  // scrypt usa 128 * N * r bytes; el máximo por defecto de Node (32 MiB) no alcanza para N = 2^17.
  const maxmem = 2 * 128 * (opciones.N ?? 0) * (opciones.r ?? 0);
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(contrasenha.normalize("NFKC"), salt, largo, { ...opciones, maxmem }, (err, clave) => {
      if (err) reject(err);
      else resolve(clave);
    });
  });
}

export async function hashearContrasenha(contrasenha: string): Promise<string> {
  const salt = randomBytes(LARGO_SALT);
  const hash = await derivar(contrasenha, salt, LARGO_HASH, COSTO);
  return [
    ALGORITMO,
    COSTO.N,
    COSTO.r,
    COSTO.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/** Compara en tiempo constante. Un hash con formato desconocido nunca verifica. */
export async function verificarContrasenha(contrasenha: string, guardado: string): Promise<boolean> {
  const [algoritmo, n, r, p, saltB64, hashB64, ...resto] = guardado.split("$");
  if (algoritmo !== ALGORITMO || !saltB64 || !hashB64 || resto.length > 0) return false;

  const opciones = { N: Number(n), r: Number(r), p: Number(p) };
  if (![opciones.N, opciones.r, opciones.p].every((v) => Number.isSafeInteger(v) && v > 0)) {
    return false;
  }

  const esperado = Buffer.from(hashB64, "base64");
  if (esperado.length === 0) return false;

  const calculado = await derivar(contrasenha, Buffer.from(saltB64, "base64"), esperado.length, opciones);
  return timingSafeEqual(calculado, esperado);
}
