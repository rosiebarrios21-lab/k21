import type { AuthError, Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from './supabase'
import type { Perfil } from './tipos'

interface EstadoSesion {
  /** true hasta saber si hay una sesión guardada. */
  cargando: boolean
  sesion: Session | null
  usuario: Perfil | null
  ingresar: (email: string, contrasenha: string) => Promise<void>
  salir: () => Promise<void>
}

export class ErrorIngreso extends Error {}

export const useSesion = create<EstadoSesion>()((set) => ({
  cargando: true,
  sesion: null,
  usuario: null,

  ingresar: async (email, contrasenha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: contrasenha })
    if (error) throw new ErrorIngreso(mensajeAuth(error))
    const perfil = await cargarPerfil(data.user.id)
    if (!perfil?.activo) {
      await supabase.auth.signOut()
      throw new ErrorIngreso('Tu usuario está desactivado. Consultá con el administrador.')
    }
    set({ sesion: data.session, usuario: perfil })
  },

  salir: async () => {
    await supabase.auth.signOut()
    set({ sesion: null, usuario: null })
  },
}))

async function cargarPerfil(id: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, email, nombre, codigo, rol, activo')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new ErrorIngreso('No se pudo cargar tu perfil. Intentá de nuevo.')
  return data
}

function mensajeAuth(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Tu email todavía no está confirmado. Consultá con el administrador.'
    case 'user_banned':
      return 'Tu usuario está desactivado. Consultá con el administrador.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Esperá unos minutos y volvé a probar.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'Sin conexión. Revisá tu internet.'
  return 'No se pudo ingresar. Intentá de nuevo.'
}

// Sesión guardada al abrir la app, renovación del token y salida desde otra pestaña.
supabase.auth.onAuthStateChange((evento, sesion) => {
  // Diferido: no se puede llamar a Supabase dentro del callback (bloquea el cliente).
  setTimeout(async () => {
    if (!sesion) {
      useSesion.setState({ cargando: false, sesion: null, usuario: null })
      return
    }
    if (evento === 'TOKEN_REFRESHED') {
      useSesion.setState({ sesion })
      return
    }
    if (evento !== 'INITIAL_SESSION' && useSesion.getState().usuario?.id === sesion.user.id) return
    try {
      const perfil = await cargarPerfil(sesion.user.id)
      if (!perfil?.activo) {
        await supabase.auth.signOut()
        return
      }
      useSesion.setState({ cargando: false, sesion, usuario: perfil })
    } catch {
      useSesion.setState({ cargando: false, sesion, usuario: null })
    }
  }, 0)
})
