/**
 * Reglas puras de validación y detección de fallas de cada ítem según el tipo de respuesta de su
 * sección. Sin acceso a la base, para poder probarlas aisladas.
 */
import type { TipoRespuesta } from "../../generated/prisma/client.js";

export interface RespuestaItem {
  respuesta?: "SI" | "NO" | "NA" | null;
  estado?: "B" | "R" | "M" | "I" | null;
  nivel?: "R" | "M" | "F" | null;
  existente?: number | null;
}

export interface ItemPlantilla {
  nombre: string;
  debeHaber: number | null;
  invertido: boolean;
}

const ESTADOS_VALIDOS: Record<TipoRespuesta, readonly string[]> = {
  SI_NO_ESTADO: ["B", "R", "M"],
  SI_NO_NIVEL: [],
  SI_NO_HABILITACION: ["B", "M", "I"],
  CANTIDAD: [],
};

/** Devuelve el mensaje de error, o null si la respuesta es completa y coherente. */
export function validarRespuesta(tipo: TipoRespuesta, r: RespuestaItem): string | null {
  if (tipo === "CANTIDAD") {
    if (r.existente == null) return "falta la cantidad existente";
    return null;
  }
  if (!r.respuesta) return "falta marcar SI / NO / N/A";
  if (tipo === "SI_NO_HABILITACION" && r.respuesta === "NA") return "N/A no corresponde";
  if (r.estado && !ESTADOS_VALIDOS[tipo].includes(r.estado)) return "estado inválido";
  if (r.nivel && tipo !== "SI_NO_NIVEL") return "nivel no corresponde";
  return null;
}

/** true si el ítem debe destacarse como problema para el admin. */
export function esFalla(tipo: TipoRespuesta, item: ItemPlantilla, r: RespuestaItem): boolean {
  if (tipo === "CANTIDAD") return (r.existente ?? 0) < (item.debeHaber ?? 1);
  if (r.respuesta === "NA") return false;
  const respuestaMala = item.invertido ? r.respuesta === "SI" : r.respuesta === "NO";
  if (respuestaMala) return true;
  if (tipo === "SI_NO_NIVEL") return r.nivel === "R";
  return r.estado === "M" || r.estado === "I";
}
