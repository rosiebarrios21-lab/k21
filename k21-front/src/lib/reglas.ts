// Espejo de k21-back/src/modules/controles/controles.reglas.ts (para marcar fallas mientras se carga).
import type { RespuestaItem, TipoRespuesta } from './tipos'

export function respondido(tipo: TipoRespuesta, r: RespuestaItem | undefined) {
  if (!r) return false
  return tipo === 'CANTIDAD' ? r.existente != null : !!r.respuesta
}

export function esFalla(
  tipo: TipoRespuesta,
  item: { debeHaber: number | null; invertido: boolean },
  r: RespuestaItem | undefined,
) {
  if (!r || !respondido(tipo, r)) return false
  if (tipo === 'CANTIDAD') return (r.existente ?? 0) < (item.debeHaber ?? 1)
  if (r.respuesta === 'NA') return false
  if (item.invertido ? r.respuesta === 'SI' : r.respuesta === 'NO') return true
  if (tipo === 'SI_NO_NIVEL') return r.nivel === 'R'
  return r.estado === 'M' || r.estado === 'I'
}

/** Respuesta "todo en orden" para completar rápido una sección. */
export function respuestaOk(
  tipo: TipoRespuesta,
  item: { id: string; debeHaber: number | null; invertido: boolean },
): RespuestaItem {
  if (tipo === 'CANTIDAD') return { itemId: item.id, existente: item.debeHaber ?? 1 }
  const respuesta = item.invertido ? 'NO' : 'SI'
  if (tipo === 'SI_NO_NIVEL') return { itemId: item.id, respuesta, nivel: 'F' }
  return { itemId: item.id, respuesta, estado: 'B' }
}
