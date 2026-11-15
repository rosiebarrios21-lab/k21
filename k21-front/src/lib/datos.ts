/**
 * Consultas a Supabase (reemplazan la API de k21-back).
 * Las columnas de la base van en snake_case; acá se renombran (alias:columna) a los tipos de tipos.ts.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  ControlDetalle,
  ControlFila,
  EncabezadoMaterial,
  EncabezadoMecanico,
  ItemPlantilla,
  Movil,
  RespuestaItem,
  Resumen,
  Rol,
  SeccionPlantilla,
  TipoControl,
  Usuario,
} from './tipos'

/** Error con mensaje en español, listo para mostrar con <MensajeError>. */
export class ErrorDatos extends Error {
  codigo: string
  /** Detalle por ítem (p. ej. "Luces › Baliza: falta marcar SI / NO / N/A"). */
  lista: string[]
  constructor(codigo: string, mensaje: string, lista: string[] = []) {
    super(mensaje)
    this.codigo = codigo
    this.lista = lista
  }
}

/** DETAIL de las funciones de la base: arreglo JSON de mensajes. */
function listaDeDetalle(detalle: string | null | undefined): string[] {
  if (!detalle) return []
  try {
    const v: unknown = JSON.parse(detalle)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

const MENSAJES_DUPLICADO: Record<string, string> = {
  movil_codigo_key: 'Ya existe un móvil con ese código.',
  item_seccion_id_nombre_key: 'Ya existe un ítem con ese nombre en esta sección.',
}

function traducir(e: PostgrestError): ErrorDatos {
  switch (e.code) {
    // raise exception de las funciones de la base: el mensaje ya viene en español.
    case 'P0001':
      return new ErrorDatos(e.code, e.message, listaDeDetalle(e.details))
    case '23505': {
      const restriccion = Object.keys(MENSAJES_DUPLICADO).find((k) => e.message.includes(k))
      return new ErrorDatos(e.code, restriccion ? MENSAJES_DUPLICADO[restriccion] : 'Ya existe un registro con esos datos.')
    }
    case '23514':
      return new ErrorDatos(e.code, 'Algún dato es inválido o demasiado largo.')
    case '42501':
      // Las funciones propias lanzan 42501 con mensaje en español; los de Postgres vienen en inglés.
      return new ErrorDatos(
        e.code,
        /^(permission denied|new row violates)/i.test(e.message) ? 'No tenés permiso para hacer esto.' : e.message,
      )
    case 'PGRST116':
      return new ErrorDatos(e.code, 'No se encontró el registro.')
  }
  if (!e.code && /fetch/i.test(e.message)) return new ErrorDatos('SIN_CONEXION', 'Sin conexión. Revisá tu internet.')
  return new ErrorDatos(e.code ?? 'ERROR', 'Ocurrió un error inesperado. Intentá de nuevo.')
}

/** Desenvuelve la respuesta de Supabase: devuelve los datos o lanza un ErrorDatos. */
async function resultado<T>(consulta: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await consulta
  if (error) throw traducir(error)
  return data as T
}

// Planillas --------------------------------------------------------------------------------------

const COLUMNAS_ITEM = 'id, nombre, orden, debeHaber:debe_haber, unidad, invertido, activo'

/**
 * Secciones de una planilla con sus ítems, en orden.
 * Con incluirInactivos el admin ve también los ítems desactivados (RLS se los oculta a los demás igual).
 */
export function obtenerPlantilla(tipo: TipoControl, incluirInactivos = false): Promise<SeccionPlantilla[]> {
  let consulta = supabase
    .from('seccion')
    .select(`id, nombre, orden, tipoRespuesta:tipo_respuesta, nota, items:item(${COLUMNAS_ITEM})`)
    .eq('tipo_control', tipo)
    .order('orden')
    .order('orden', { referencedTable: 'item' })
  if (!incluirInactivos) consulta = consulta.eq('item.activo', true)
  return resultado(consulta.returns<SeccionPlantilla[]>())
}

export type CambiosItem = Partial<Pick<ItemPlantilla, 'nombre' | 'debeHaber' | 'unidad' | 'invertido' | 'activo'>>

const columnasItem = (c: CambiosItem) => ({
  ...(c.nombre !== undefined && { nombre: c.nombre }),
  ...(c.debeHaber !== undefined && { debe_haber: c.debeHaber }),
  ...(c.unidad !== undefined && { unidad: c.unidad }),
  ...(c.invertido !== undefined && { invertido: c.invertido }),
  ...(c.activo !== undefined && { activo: c.activo }),
})

/** Agrega un ítem al final de la sección (el orden lo calcula la base). */
export function agregarItem(seccionId: string, nombre: string): Promise<ItemPlantilla> {
  return resultado(
    supabase.from('item').insert({ seccion_id: seccionId, nombre }).select(COLUMNAS_ITEM).single<ItemPlantilla>(),
  )
}

export function actualizarItem(id: string, cambios: CambiosItem): Promise<ItemPlantilla> {
  return resultado(supabase.from('item').update(columnasItem(cambios)).eq('id', id).select(COLUMNAS_ITEM).single<ItemPlantilla>())
}

// Móviles ----------------------------------------------------------------------------------------

const COLUMNAS_MOVIL = 'id, codigo, descripcion, activo'

/** Móviles por código. Con todos, el admin ve también los inactivos (RLS se los oculta a los demás igual). */
export function listarMoviles(todos = false): Promise<Movil[]> {
  let consulta = supabase.from('movil').select(COLUMNAS_MOVIL).order('codigo')
  if (!todos) consulta = consulta.eq('activo', true)
  return resultado(consulta.returns<Movil[]>())
}

export interface DatosMovil {
  codigo: string
  descripcion: string | null
  activo?: boolean
}

/** Crea o actualiza un móvil. El código se pasa a mayúsculas en la base. */
export function guardarMovil(id: string | undefined, datos: DatosMovil): Promise<Movil> {
  const consulta = id ? supabase.from('movil').update(datos).eq('id', id) : supabase.from('movil').insert(datos)
  return resultado(consulta.select(COLUMNAS_MOVIL).single<Movil>())
}

// Controles --------------------------------------------------------------------------------------
// Todo pasa por funciones de la base (supabase/migrations/20261114140000_controles.sql), que validan
// la planilla, calculan las fallas y verifican rol y autoría.

export interface FiltrosControles {
  tipo?: string
  estado?: string
  movilId?: string
  desde?: string
  hasta?: string
  pagina?: number
}

export interface PaginaControles {
  total: number
  pagina: number
  porPagina: number
  filas: ControlFila[]
}

export function listarControles(f: FiltrosControles): Promise<PaginaControles> {
  return resultado(
    supabase.rpc('listar_controles', {
      p_tipo: f.tipo || null,
      p_estado: f.estado || null,
      p_movil_id: f.movilId || null,
      p_desde: f.desde || null,
      p_hasta: f.hasta || null,
      p_pagina: f.pagina ?? 1,
    }),
  )
}

export function obtenerControl(id: string): Promise<ControlDetalle> {
  return resultado(supabase.rpc('obtener_control', { p_id: id }))
}

export interface DatosControl {
  tipo: TipoControl
  movilId: string
  fecha: string
  servicio: string | null
  observacion: string | null
  encabezado: EncabezadoMecanico | EncabezadoMaterial
  items: RespuestaItem[]
}

/** Crea un control, o corrige uno existente (vuelve a quedar pendiente). */
export function guardarControl(id: string | undefined, datos: DatosControl): Promise<{ id: string; numero: number }> {
  return resultado(supabase.rpc('guardar_control', { p_datos: datos, p_id: id ?? null }))
}

export function revisarControl(id: string, estado: 'APROBADO' | 'OBSERVADO', comentario: string): Promise<unknown> {
  return resultado(supabase.rpc('revisar_control', { p_id: id, p_estado: estado, p_comentario: comentario || null }))
}

export function obtenerResumen(): Promise<Resumen> {
  return resultado(supabase.rpc('resumen_controles'))
}

// Usuarios ---------------------------------------------------------------------------------------
// La lista se lee directo (RLS deja al admin ver todos). Altas y cambios van por la Edge Function
// admin-usuarios (supabase/functions), que usa la API de administración de Auth.

export function listarUsuarios(): Promise<Usuario[]> {
  return resultado(supabase.from('usuario').select('id, email, nombre, codigo, rol, activo').order('nombre').returns<Usuario[]>())
}

export interface DatosUsuario {
  email: string
  nombre: string
  codigo: string | null
  rol: Rol
  /** Al crear es obligatoria; al editar, vacía no cambia la contraseña. */
  contrasenha?: string
  activo?: boolean
}

async function adminUsuarios(cuerpo: Record<string, unknown>): Promise<Usuario> {
  const { data, error } = await supabase.functions.invoke<{ data: Usuario }>('admin-usuarios', { body: cuerpo })
  if (error) {
    // FunctionsHttpError trae la respuesta con { error: { mensaje } }.
    const respuesta = (error as { context?: Response }).context
    const json = respuesta instanceof Response ? await respuesta.json().catch(() => null) : null
    if (json?.error?.mensaje) throw new ErrorDatos('FUNCION', json.error.mensaje)
    if (error.name === 'FunctionsFetchError') throw new ErrorDatos('SIN_CONEXION', 'Sin conexión. Revisá tu internet.')
    throw new ErrorDatos('FUNCION', 'No se pudo completar la operación. Intentá de nuevo.')
  }
  return data!.data
}

export function crearUsuario(d: DatosUsuario): Promise<Usuario> {
  return adminUsuarios({ accion: 'crear', ...d })
}

export function actualizarUsuario(id: string, d: Partial<DatosUsuario>): Promise<Usuario> {
  return adminUsuarios({ accion: 'actualizar', id, ...d })
}
