export type Rol = 'ADMIN' | 'CHOFER' | 'RESPONDIENTE'
export type TipoControl = 'MECANICO' | 'MATERIAL'
export type TipoRespuesta = 'SI_NO_ESTADO' | 'SI_NO_NIVEL' | 'SI_NO_HABILITACION' | 'CANTIDAD'
export type EstadoControl = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO'
export type Respuesta = 'SI' | 'NO' | 'NA'
export type Estado = 'B' | 'R' | 'M' | 'I'
export type Nivel = 'R' | 'M' | 'F'

/** Fila de public.usuario: perfil de un usuario de Supabase Auth (mismo id). */
export interface Usuario {
  id: string
  email: string
  nombre: string
  codigo: string | null
  rol: Rol
  activo: boolean
}

export interface Movil {
  id: string
  codigo: string
  descripcion: string | null
  activo: boolean
}

export interface ItemPlantilla {
  id: string
  nombre: string
  orden: number
  debeHaber: number | null
  unidad: string | null
  invertido: boolean
  activo: boolean
}

export interface SeccionPlantilla {
  id: string
  nombre: string
  orden: number
  tipoRespuesta: TipoRespuesta
  nota: string | null
  items: ItemPlantilla[]
}

export interface RespuestaItem {
  itemId: string
  respuesta?: Respuesta | null
  estado?: Estado | null
  nivel?: Nivel | null
  existente?: number | null
  nota?: string | null
}

export interface EncabezadoMecanico {
  grupo?: string | null
  numero?: string | null
  aCargoCompania?: string | null
  combustible?: Nivel | null
}

export interface EncabezadoMaterial {
  aCargoMovil?: string | null
  controlAcompanante?: string | null
}

export interface ControlFila {
  id: string
  numero: number
  tipo: TipoControl
  fecha: string
  servicio: string | null
  estado: EstadoControl
  cantidadFallas: number
  creadoEl: string
  movil: { codigo: string }
  autor: { nombre: string; codigo: string | null }
}

export interface ItemDetalle extends Omit<RespuestaItem, 'itemId'> {
  itemId: string
  nombre: string
  debeHaber: number | null
  unidad: string | null
  invertido: boolean
  falla: boolean
}

export interface ControlDetalle {
  id: string
  numero: number
  tipo: TipoControl
  fecha: string
  servicio: string | null
  encabezado: EncabezadoMecanico & EncabezadoMaterial
  observacion: string | null
  estado: EstadoControl
  cantidadFallas: number
  comentarioRevision: string | null
  revisadoEl: string | null
  creadoEl: string
  movil: { id: string; codigo: string; descripcion: string | null }
  autor: { id: string; nombre: string; codigo: string | null; rol: Rol }
  revisor: { nombre: string; codigo: string | null } | null
  secciones: (Omit<SeccionPlantilla, 'items'> & { items: ItemDetalle[] })[]
}

export interface Resumen {
  conteos: { tipo: TipoControl; estado: EstadoControl; cantidad: number }[]
  moviles: {
    id: string
    codigo: string
    descripcion: string | null
    mecanico: UltimoControl | null
    material: UltimoControl | null
  }[]
}

export interface UltimoControl {
  id: string
  numero: number
  fecha: string
  estado: EstadoControl
  cantidadFallas: number
}

export const NOMBRE_TIPO: Record<TipoControl, string> = {
  MECANICO: 'Control mecánico',
  MATERIAL: 'Material menor',
}

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  CHOFER: 'Chofer',
  RESPONDIENTE: 'Respondiente',
}

export const NOMBRE_ESTADO: Record<EstadoControl, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  OBSERVADO: 'Observado',
}

export const NOMBRE_NIVEL: Record<Nivel, string> = { R: 'Reserva', M: 'Medio', F: 'Full' }

export const ESTADOS_POR_TIPO: Record<TipoRespuesta, { valor: Estado; nombre: string }[]> = {
  SI_NO_ESTADO: [
    { valor: 'B', nombre: 'Bueno' },
    { valor: 'R', nombre: 'Regular' },
    { valor: 'M', nombre: 'Malo' },
  ],
  SI_NO_HABILITACION: [
    { valor: 'B', nombre: 'Bueno' },
    { valor: 'M', nombre: 'Malo' },
    { valor: 'I', nombre: 'Inoperativo' },
  ],
  SI_NO_NIVEL: [],
  CANTIDAD: [],
}

/** Qué rol carga cada tipo de control. */
export function tiposQuePuedeCargar(rol: Rol): TipoControl[] {
  if (rol === 'CHOFER') return ['MECANICO']
  if (rol === 'RESPONDIENTE') return ['MATERIAL']
  return ['MECANICO', 'MATERIAL']
}

export function fechaCorta(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function hoyIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Usuario en sesión. */
export type Perfil = Usuario
