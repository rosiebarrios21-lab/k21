import type { z } from "zod";
import type { Prisma, Rol, TipoControl } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { conflicto, invalido, noEncontrado, prohibido } from "../../lib/errores.js";
import type { Sesion } from "../../lib/tokens.js";
import { obtenerPlantilla } from "../plantillas/plantillas.js";
import { esFalla, validarRespuesta } from "./controles.reglas.js";
import type { filtrosSchema, GuardarControl, revisionSchema } from "./controles.schema.js";

const POR_PAGINA = 20;

/** El chofer hace el control mecánico, el respondiente el de material menor; el admin, ambos. */
export function puedeCargar(rol: Rol, tipo: TipoControl) {
  return rol === "ADMIN" || (rol === "CHOFER" && tipo === "MECANICO") || (rol === "RESPONDIENTE" && tipo === "MATERIAL");
}

/** Verifica que estén todos los ítems activos de la plantilla, cada uno una vez y bien respondido. */
async function prepararItems(datos: GuardarControl) {
  const plantilla = await obtenerPlantilla(datos.tipo);
  const recibidos = new Map(datos.items.map((i) => [i.itemId, i]));
  if (recibidos.size !== datos.items.length) throw invalido("Hay ítems repetidos");

  const errores: string[] = [];
  const filas: Omit<Prisma.ControlItemCreateManyInput, "controlId">[] = [];
  const idsPlantilla = new Set<string>();

  for (const seccion of plantilla) {
    for (const item of seccion.items) {
      idsPlantilla.add(item.id);
      const r = recibidos.get(item.id);
      const error = r ? validarRespuesta(seccion.tipoRespuesta, r) : "sin responder";
      if (error || !r) {
        errores.push(`${seccion.nombre} › ${item.nombre}: ${error}`);
        continue;
      }
      const cantidad = seccion.tipoRespuesta === "CANTIDAD";
      filas.push({
        itemId: item.id,
        respuesta: cantidad ? null : (r.respuesta ?? null),
        estado: cantidad ? null : (r.estado ?? null),
        nivel: seccion.tipoRespuesta === "SI_NO_NIVEL" ? (r.nivel ?? null) : null,
        existente: cantidad ? (r.existente ?? null) : null,
        nota: r.nota ?? null,
        falla: esFalla(seccion.tipoRespuesta, item, r),
      });
    }
  }
  if (datos.items.some((i) => !idsPlantilla.has(i.itemId))) {
    errores.push("Hay ítems que no pertenecen a la planilla (recargá la página)");
  }
  if (errores.length > 0) throw invalido("La planilla está incompleta", { items: errores });
  return filas;
}

async function validarMovil(movilId: string) {
  const movil = await prisma.movil.findUnique({ where: { id: movilId } });
  if (!movil?.activo) throw invalido("El móvil no existe o está inactivo");
}

export async function crear(sesion: Sesion, datos: GuardarControl) {
  if (!puedeCargar(sesion.rol, datos.tipo)) throw prohibido("Tu rol no carga este tipo de control");
  await validarMovil(datos.movilId);
  const filas = await prepararItems(datos);
  return prisma.control.create({
    data: {
      tipo: datos.tipo,
      movilId: datos.movilId,
      autorId: sesion.id,
      fecha: new Date(datos.fecha),
      servicio: datos.servicio ?? null,
      encabezado: datos.encabezado,
      observacion: datos.observacion ?? null,
      cantidadFallas: filas.filter((f) => f.falla).length,
      items: { createMany: { data: filas } },
    },
    select: { id: true, numero: true },
  });
}

/** El autor corrige un control pendiente u observado; vuelve a quedar pendiente de revisión. */
export async function actualizar(sesion: Sesion, id: string, datos: GuardarControl) {
  const control = await prisma.control.findUnique({ where: { id } });
  if (!control) throw noEncontrado("Control no encontrado");
  if (control.autorId !== sesion.id) throw prohibido("Solo quien cargó el control puede corregirlo");
  if (control.estado === "APROBADO") throw conflicto("El control ya fue aprobado");
  if (control.tipo !== datos.tipo) throw invalido("No se puede cambiar el tipo de control");
  await validarMovil(datos.movilId);
  const filas = await prepararItems(datos);
  return prisma.$transaction(async (tx) => {
    await tx.controlItem.deleteMany({ where: { controlId: id } });
    return tx.control.update({
      where: { id },
      data: {
        movilId: datos.movilId,
        fecha: new Date(datos.fecha),
        servicio: datos.servicio ?? null,
        encabezado: datos.encabezado,
        observacion: datos.observacion ?? null,
        estado: "PENDIENTE",
        cantidadFallas: filas.filter((f) => f.falla).length,
        items: { createMany: { data: filas } },
      },
      select: { id: true, numero: true },
    });
  });
}

export async function listar(sesion: Sesion, f: z.infer<typeof filtrosSchema>) {
  const where: Prisma.ControlWhereInput = {
    ...(sesion.rol === "ADMIN" ? {} : { autorId: sesion.id }),
    ...(f.tipo ? { tipo: f.tipo } : {}),
    ...(f.estado ? { estado: f.estado } : {}),
    ...(f.movilId ? { movilId: f.movilId } : {}),
    ...(f.desde || f.hasta
      ? { fecha: { ...(f.desde ? { gte: new Date(f.desde) } : {}), ...(f.hasta ? { lte: new Date(f.hasta) } : {}) } }
      : {}),
  };
  const [total, filas] = await prisma.$transaction([
    prisma.control.count({ where }),
    prisma.control.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { numero: "desc" }],
      skip: (f.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        numero: true,
        tipo: true,
        fecha: true,
        servicio: true,
        estado: true,
        cantidadFallas: true,
        creadoEl: true,
        movil: { select: { codigo: true } },
        autor: { select: { nombre: true, codigo: true } },
      },
    }),
  ]);
  return { total, pagina: f.pagina, porPagina: POR_PAGINA, filas };
}

export async function obtener(sesion: Sesion, id: string) {
  const control = await prisma.control.findUnique({
    where: { id },
    include: {
      movil: { select: { id: true, codigo: true, descripcion: true } },
      autor: { select: { id: true, nombre: true, codigo: true, rol: true } },
      revisor: { select: { nombre: true, codigo: true } },
      items: { include: { item: { include: { seccion: true } } } },
    },
  });
  if (!control) throw noEncontrado("Control no encontrado");
  if (sesion.rol !== "ADMIN" && control.autorId !== sesion.id) throw prohibido();

  // Agrupa las respuestas por sección, en el orden de la planilla.
  const secciones = new Map<string, { id: string; nombre: string; orden: number; tipoRespuesta: string; nota: string | null; items: unknown[] }>();
  for (const ci of [...control.items].sort((a, b) => a.item.seccion.orden - b.item.seccion.orden || a.item.orden - b.item.orden)) {
    const s = ci.item.seccion;
    if (!secciones.has(s.id)) {
      secciones.set(s.id, { id: s.id, nombre: s.nombre, orden: s.orden, tipoRespuesta: s.tipoRespuesta, nota: s.nota, items: [] });
    }
    secciones.get(s.id)!.items.push({
      itemId: ci.itemId,
      nombre: ci.item.nombre,
      debeHaber: ci.item.debeHaber,
      unidad: ci.item.unidad,
      invertido: ci.item.invertido,
      respuesta: ci.respuesta,
      estado: ci.estado,
      nivel: ci.nivel,
      existente: ci.existente,
      nota: ci.nota,
      falla: ci.falla,
    });
  }
  const { items: _items, ...resto } = control;
  return { ...resto, secciones: [...secciones.values()] };
}

export async function revisar(sesion: Sesion, id: string, datos: z.infer<typeof revisionSchema>) {
  const control = await prisma.control.findUnique({ where: { id } });
  if (!control) throw noEncontrado("Control no encontrado");
  if (control.estado !== "PENDIENTE") throw conflicto("Solo se revisan controles pendientes");
  return prisma.control.update({
    where: { id },
    data: {
      estado: datos.estado,
      comentarioRevision: datos.comentario ?? null,
      revisorId: sesion.id,
      revisadoEl: new Date(),
    },
    select: { id: true, estado: true },
  });
}

/** Tablero: pendientes por tipo y último control de cada móvil activo. */
export async function resumen(sesion: Sesion) {
  const soloPropios = sesion.rol === "ADMIN" ? {} : { autorId: sesion.id };
  const conteos = await prisma.control.groupBy({
    by: ["tipo", "estado"],
    where: soloPropios,
    _count: { _all: true },
  });
  const moviles = await prisma.movil.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } });
  const ultimos = await Promise.all(
    moviles.flatMap((m) =>
      (["MECANICO", "MATERIAL"] as const).map(async (tipo) => ({
        movilId: m.id,
        tipo,
        control: await prisma.control.findFirst({
          where: { movilId: m.id, tipo, ...soloPropios },
          orderBy: [{ fecha: "desc" }, { numero: "desc" }],
          select: { id: true, numero: true, fecha: true, estado: true, cantidadFallas: true },
        }),
      })),
    ),
  );
  return {
    conteos: conteos.map((c) => ({ tipo: c.tipo, estado: c.estado, cantidad: c._count._all })),
    moviles: moviles.map((m) => ({
      id: m.id,
      codigo: m.codigo,
      descripcion: m.descripcion,
      mecanico: ultimos.find((u) => u.movilId === m.id && u.tipo === "MECANICO")?.control ?? null,
      material: ultimos.find((u) => u.movilId === m.id && u.tipo === "MATERIAL")?.control ?? null,
    })),
  };
}
