import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Boton, Campo, Cargando, cx, Entrada, MensajeError, Selector, Tarjeta } from '../components/ui'
import { actualizarUsuario, crearUsuario, listarUsuarios } from '../lib/datos'
import { useSesion } from '../lib/sesion'
import type { Rol } from '../lib/tipos'
import { NOMBRE_ROL } from '../lib/tipos'

interface Edicion {
  id?: string
  email: string
  nombre: string
  codigo: string
  rol: Rol
  contrasenha: string
  activo: boolean
}

export function Usuarios() {
  const yo = useSesion((s) => s.usuario!)
  const qc = useQueryClient()
  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: listarUsuarios })
  const [edicion, setEdicion] = useState<Edicion | null>(null)

  const guardar = useMutation({
    mutationFn: (e: Edicion) => {
      const datos = { email: e.email, nombre: e.nombre, codigo: e.codigo || null, rol: e.rol }
      return e.id
        ? actualizarUsuario(e.id, { ...datos, activo: e.activo, ...(e.contrasenha && { contrasenha: e.contrasenha }) })
        : crearUsuario({ ...datos, contrasenha: e.contrasenha })
    },
    onSuccess: () => {
      setEdicion(null)
      void qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="flex-1 text-xl font-bold">Usuarios</h1>
        <Boton
          onClick={() => {
            guardar.reset()
            setEdicion({ email: '', nombre: '', codigo: '', rol: 'CHOFER', contrasenha: '', activo: true })
          }}
        >
          <Plus className="size-4" /> Nuevo
        </Boton>
      </div>

      {edicion && (
        <Tarjeta>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault()
              guardar.mutate(edicion)
            }}
          >
            <h2 className="font-bold sm:col-span-2">{edicion.id ? `Editar ${edicion.nombre}` : 'Nuevo usuario'}</h2>
            <Campo etiqueta="Email (para ingresar)">
              <Entrada
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                value={edicion.email}
                onChange={(e) => setEdicion({ ...edicion, email: e.target.value })}
                required
              />
            </Campo>
            <Campo etiqueta="Nombre y apellido">
              <Entrada value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Código" ayuda="Ej.: VK21-15">
              <Entrada value={edicion.codigo} onChange={(e) => setEdicion({ ...edicion, codigo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Rol">
              <Selector value={edicion.rol} onChange={(e) => setEdicion({ ...edicion, rol: e.target.value as Rol })} disabled={edicion.id === yo.id}>
                {Object.entries(NOMBRE_ROL).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo
              etiqueta={edicion.id ? 'Nueva contraseña' : 'Contraseña'}
              ayuda={edicion.id ? 'Dejá vacío para no cambiarla. Pasásela a la persona.' : 'Mínimo 6 caracteres. Pasásela a la persona.'}
            >
              <Entrada
                type="password"
                autoComplete="new-password"
                value={edicion.contrasenha}
                onChange={(e) => setEdicion({ ...edicion, contrasenha: e.target.value })}
                required={!edicion.id}
                minLength={6}
              />
            </Campo>
            {edicion.id && edicion.id !== yo.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-marca-700"
                  checked={edicion.activo}
                  onChange={(e) => setEdicion({ ...edicion, activo: e.target.checked })}
                />
                Activo (puede ingresar)
              </label>
            )}
            <div className="sm:col-span-2">
              <MensajeError error={guardar.error} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Boton type="button" variante="secundario" onClick={() => setEdicion(null)}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={guardar.isPending}>
                Guardar
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}

      <MensajeError error={usuarios.error} />
      {usuarios.isLoading && <Cargando />}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        {usuarios.data?.map((u) => (
          <li key={u.id}>
            <button
              className={cx('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50', !u.activo && 'opacity-50')}
              onClick={() => {
                guardar.reset()
                setEdicion({ id: u.id, email: u.email, nombre: u.nombre, codigo: u.codigo ?? '', rol: u.rol, contrasenha: '', activo: u.activo })
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {u.nombre} {u.codigo && <span className="font-normal text-zinc-500">· {u.codigo}</span>}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {u.email}
                  {!u.activo && ' · inactivo'}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">{NOMBRE_ROL[u.rol]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
