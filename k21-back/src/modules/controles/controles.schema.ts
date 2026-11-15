import { z } from "zod";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

const nivel = z.enum(["R", "M", "F"]);

export const encabezadoMecanicoSchema = z.object({
  grupo: textoOpcional(30),
  numero: textoOpcional(30),
  aCargoCompania: textoOpcional(100),
  combustible: nivel.nullish(),
});

export const encabezadoMaterialSchema = z.object({
  aCargoMovil: textoOpcional(100),
  controlAcompanante: textoOpcional(100),
});

const respuestaItemSchema = z.object({
  itemId: z.uuid(),
  respuesta: z.enum(["SI", "NO", "NA"]).nullish(),
  estado: z.enum(["B", "R", "M", "I"]).nullish(),
  nivel: nivel.nullish(),
  existente: z.number().int().min(0).max(100000).nullish(),
  nota: textoOpcional(200),
});

const base = {
  movilId: z.uuid(),
  fecha: z.iso.date(),
  servicio: textoOpcional(100),
  observacion: textoOpcional(1000),
  items: z.array(respuestaItemSchema).min(1),
};

export const guardarControlSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("MECANICO"), encabezado: encabezadoMecanicoSchema, ...base }),
  z.object({ tipo: z.literal("MATERIAL"), encabezado: encabezadoMaterialSchema, ...base }),
]);
export type GuardarControl = z.infer<typeof guardarControlSchema>;

export const revisionSchema = z
  .object({
    estado: z.enum(["APROBADO", "OBSERVADO"]),
    comentario: textoOpcional(1000),
  })
  .refine((r) => r.estado === "APROBADO" || !!r.comentario, {
    message: "Indicá qué hay que corregir",
    path: ["comentario"],
  });

export const filtrosSchema = z.object({
  tipo: z.enum(["MECANICO", "MATERIAL"]).optional(),
  estado: z.enum(["PENDIENTE", "APROBADO", "OBSERVADO"]).optional(),
  movilId: z.uuid().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
});
