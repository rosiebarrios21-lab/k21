import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Boton, Campo, Entrada, MensajeError, Tarjeta } from '../components/ui'
import { useSesion } from '../lib/sesion'
import { supabase } from '../lib/supabase'

export function CambiarContrasenha() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const cambiar = useMutation({
    mutationFn: async () => {
      const email = useSesion.getState().usuario!.email
      // Supabase no pide la contraseña actual para cambiarla: se verifica antes.
      const verificacion = await supabase.auth.signInWithPassword({ email, password: actual })
      if (verificacion.error) throw new Error(verificacion.error.code === 'invalid_credentials' ? 'La contraseña actual no es correcta.' : 'No se pudo verificar la contraseña actual.')
      const { error } = await supabase.auth.updateUser({ password: nueva })
      if (error) throw new Error(error.code === 'weak_password' ? 'La nueva contraseña es muy débil.' : error.code === 'same_password' ? 'La nueva contraseña tiene que ser distinta a la actual.' : 'No se pudo cambiar la contraseña.')
    },
    onSuccess: () => {
      setActual('')
      setNueva('')
      setRepetir('')
    },
  })

  return (
    <Tarjeta className="mx-auto max-w-sm">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          cambiar.mutate()
        }}
      >
        <h1 className="text-lg font-bold">Cambiar contraseña</h1>
        <Campo etiqueta="Contraseña actual">
          <Entrada type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Nueva contraseña">
          <Entrada type="password" autoComplete="new-password" minLength={6} value={nueva} onChange={(e) => setNueva(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Repetir nueva contraseña">
          <Entrada type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} required />
        </Campo>
        {repetir && nueva !== repetir && <p className="text-sm text-destructive">Las contraseñas no coinciden</p>}
        <MensajeError error={cambiar.error} />
        {cambiar.isSuccess && <p className="text-sm font-medium text-emerald-700">Contraseña actualizada.</p>}
        <Boton type="submit" className="w-full" disabled={nueva !== repetir} cargando={cambiar.isPending}>
          Guardar
        </Boton>
      </form>
    </Tarjeta>
  )
}
