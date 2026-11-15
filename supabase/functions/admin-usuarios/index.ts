// Administración de usuarios: alta, edición, activación y reseteo de contraseña.
// Usa la API de administración de Supabase Auth (clave secreta), por eso vive acá y no en el front.
// Solo la puede usar un usuario con rol ADMIN activo.
//
// POST { accion: 'crear', email, contrasenha, nombre, codigo?, rol }
// POST { accion: 'actualizar', id, email?, nombre?, codigo?, rol?, activo?, contrasenha? }
//
// Se despliega con --no-verify-jwt: el token del usuario se verifica acá adentro con auth.getUser.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const ROLES = ['ADMIN', 'CHOFER', 'RESPONDIENTE'] as const
type Rol = (typeof ROLES)[number]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class ErrorPedido extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Validaciones ---------------------------------------------------------------------------------

function texto(v: unknown, campo: string, { min = 0, max }: { min?: number; max: number }): string | null {
  if (v == null) return null
  if (typeof v !== 'string') throw new ErrorPedido(400, `${campo} inválido`)
  const t = v.trim()
  if (t.length < min) throw new ErrorPedido(400, `Completá ${campo.toLowerCase()}`)
  if (t.length > max) throw new ErrorPedido(400, `${campo} admite hasta ${max} caracteres`)
  return t || null
}

function email(v: unknown): string {
  const e = texto(v, 'Email', { min: 1, max: 254 })!.toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ErrorPedido(400, 'El email no es válido')
  return e
}

function rol(v: unknown): Rol {
  if (!ROLES.includes(v as Rol)) throw new ErrorPedido(400, 'Rol inválido')
  return v as Rol
}

function contrasenha(v: unknown): string {
  if (typeof v !== 'string' || v.length < 6) throw new ErrorPedido(400, 'La contraseña debe tener al menos 6 caracteres')
  if (v.length > 72) throw new ErrorPedido(400, 'La contraseña admite hasta 72 caracteres')
  return v
}

function errorAuth(e: { code?: string; message: string }): ErrorPedido {
  switch (e.code) {
    case 'email_exists':
      return new ErrorPedido(409, 'Ya existe un usuario con ese email')
    case 'weak_password':
      return new ErrorPedido(400, 'La contraseña es muy débil')
    case 'user_not_found':
      return new ErrorPedido(404, 'Usuario no encontrado')
  }
  console.error('auth admin:', e)
  return new ErrorPedido(500, 'No se pudo completar la operación')
}

const COLUMNAS = 'id, email, nombre, codigo, rol, activo'

async function perfil(id: string) {
  const { data, error } = await admin.from('usuario').select(COLUMNAS).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// Acciones -------------------------------------------------------------------------------------

async function crear(d: Record<string, unknown>) {
  const datos = {
    email: email(d.email),
    password: contrasenha(d.contrasenha),
    nombre: texto(d.nombre, 'Nombre', { min: 1, max: 100 })!,
    codigo: texto(d.codigo, 'Código', { max: 30 }),
    rol: rol(d.rol),
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
    app_metadata: { rol: datos.rol, nombre: datos.nombre, codigo: datos.codigo },
  })
  if (error) throw errorAuth(error)

  // El trigger private.crear_perfil ya creó la fila, pero Auth guarda app_metadata después del
  // insert, así que el trigger no ve rol/nombre/código y la deja inactiva: se completa acá.
  const { error: errorPerfil } = await admin
    .from('usuario')
    .update({ nombre: datos.nombre, codigo: datos.codigo, rol: datos.rol, activo: true })
    .eq('id', data.user.id)
  if (errorPerfil) {
    await admin.auth.admin.deleteUser(data.user.id)
    throw errorPerfil
  }
  return perfil(data.user.id)
}

async function actualizar(d: Record<string, unknown>, idSesion: string) {
  const id = typeof d.id === 'string' ? d.id : ''
  const actual = id && (await perfil(id))
  if (!actual) throw new ErrorPedido(404, 'Usuario no encontrado')

  const cambios: Record<string, unknown> = {}
  if (d.nombre !== undefined) cambios.nombre = texto(d.nombre, 'Nombre', { min: 1, max: 100 })
  if (d.codigo !== undefined) cambios.codigo = texto(d.codigo, 'Código', { max: 30 })
  if (d.rol !== undefined) cambios.rol = rol(d.rol)
  if (d.activo !== undefined) {
    if (typeof d.activo !== 'boolean') throw new ErrorPedido(400, 'Activo inválido')
    cambios.activo = d.activo
  }
  if (id === idSesion && (cambios.activo === false || (cambios.rol && cambios.rol !== 'ADMIN'))) {
    throw new ErrorPedido(400, 'No podés desactivarte ni quitarte el rol de administrador a vos mismo')
  }

  // Auth: email, contraseña y bloqueo (un usuario inactivo no puede renovar su sesión).
  const auth: Record<string, unknown> = {}
  if (d.email !== undefined) {
    const nuevo = email(d.email)
    if (nuevo !== actual.email) Object.assign(auth, { email: nuevo, email_confirm: true })
  }
  if (d.contrasenha) auth.password = contrasenha(d.contrasenha)
  // Se aplica siempre que venga "activo" (no solo si cambió), así Auth queda alineado con el perfil.
  if (cambios.activo !== undefined) auth.ban_duration = cambios.activo ? 'none' : '876000h'
  if (cambios.rol !== undefined || cambios.nombre !== undefined || cambios.codigo !== undefined) {
    auth.app_metadata = {
      rol: cambios.rol ?? actual.rol,
      nombre: cambios.nombre ?? actual.nombre,
      codigo: cambios.codigo !== undefined ? cambios.codigo : actual.codigo,
    }
  }
  if (Object.keys(auth).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(id, auth)
    if (error) throw errorAuth(error)
  }

  if (Object.keys(cambios).length > 0) {
    const { error } = await admin.from('usuario').update(cambios).eq('id', id)
    if (error) throw error
  }
  return perfil(id)
}

// Entrada --------------------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: { mensaje: 'Método no permitido' } })

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) throw new ErrorPedido(401, 'Iniciá sesión de nuevo')
    const { data: sesion, error: errorSesion } = await admin.auth.getUser(token)
    if (errorSesion || !sesion.user) throw new ErrorPedido(401, 'Iniciá sesión de nuevo')

    const yo = await perfil(sesion.user.id)
    if (!yo?.activo || yo.rol !== 'ADMIN') throw new ErrorPedido(403, 'Solo el administrador gestiona usuarios')

    const cuerpo = await req.json().catch(() => null)
    if (!cuerpo || typeof cuerpo !== 'object') throw new ErrorPedido(400, 'Pedido inválido')

    switch (cuerpo.accion) {
      case 'crear':
        return json(201, { data: await crear(cuerpo) })
      case 'actualizar':
        return json(200, { data: await actualizar(cuerpo, sesion.user.id) })
      default:
        throw new ErrorPedido(400, 'Acción inválida')
    }
  } catch (e) {
    if (e instanceof ErrorPedido) return json(e.status, { error: { mensaje: e.message } })
    console.error(e)
    return json(500, { error: { mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' } })
  }
})
