import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Boton, Campo, Cargando, cx, Entrada, MensajeError, Tarjeta } from '../components/ui'
import { guardarMovil, listarMoviles } from '../lib/datos'

type Edicion = { id?: string; codigo: string; descripcion: string; activo: boolean }

export function Moviles() {
  const qc = useQueryClient()
  const moviles = useQuery({ queryKey: ['moviles', 'todos'], queryFn: () => listarMoviles(true) })
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const guardar = useMutation({
    mutationFn: (e: Edicion) =>
      // El estado activo solo se cambia al editar; un móvil nuevo nace activo.
      guardarMovil(e.id, { codigo: e.codigo, descripcion: e.descripcion, ...(e.id && { activo: e.activo }) }),
    onSuccess: () => {
      setEdicion(null)
      void qc.invalidateQueries({ queryKey: ['moviles'] })
      void qc.invalidateQueries({ queryKey: ['resumen'] })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="flex-1 text-xl font-bold">Móviles</h1>
        <Boton
          onClick={() => {
            guardar.reset()
            setEdicion({ codigo: '', descripcion: '', activo: true })
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
            <Campo etiqueta="Código" ayuda="Ej.: AM21">
              <Entrada value={edicion.codigo} onChange={(e) => setEdicion({ ...edicion, codigo: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Descripción">
              <Entrada value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} />
            </Campo>
            {edicion.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-marca-700"
                  checked={edicion.activo}
                  onChange={(e) => setEdicion({ ...edicion, activo: e.target.checked })}
                />
                Activo (aparece para cargar controles)
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

      <MensajeError error={moviles.error} />
      {moviles.isLoading && <Cargando />}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        {moviles.data?.map((m) => (
          <li key={m.id}>
            <button
              className={cx('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50', !m.activo && 'opacity-50')}
              onClick={() => {
                guardar.reset()
                setEdicion({ id: m.id, codigo: m.codigo, descripcion: m.descripcion ?? '', activo: m.activo })
              }}
            >
              <span className="font-black">{m.codigo}</span>
              <span className="flex-1 text-sm text-zinc-600">{m.descripcion}</span>
              {!m.activo && <span className="text-xs text-zinc-500">inactivo</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
