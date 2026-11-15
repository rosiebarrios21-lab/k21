import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Boton, Cargando, cx, Entrada, MensajeError, Segmentos } from '../components/ui'
import { actualizarItem, agregarItem, type CambiosItem, obtenerPlantilla } from '../lib/datos'
import type { ItemPlantilla, SeccionPlantilla, TipoControl } from '../lib/tipos'
import { NOMBRE_TIPO } from '../lib/tipos'

/** El admin ajusta los ítems de cada planilla: nombre, cantidad mínima, activo. */
export function Planillas() {
  const [tipo, setTipo] = useState<TipoControl>('MECANICO')
  const plantilla = useQuery({
    queryKey: ['plantilla', tipo, 'todos'],
    queryFn: () => obtenerPlantilla(tipo, true),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Planillas</h1>
      <Segmentos
        opciones={(['MECANICO', 'MATERIAL'] as const).map((v) => ({ valor: v, nombre: NOMBRE_TIPO[v] }))}
        valor={tipo}
        onChange={(v) => v && setTipo(v)}
        colores={{ MECANICO: 'bg-marca-700 text-white', MATERIAL: 'bg-marca-700 text-white' }}
      />
      <p className="text-sm text-zinc-600">
        Los cambios se aplican a los controles nuevos; los ya cargados conservan lo que se respondió. Un ítem desactivado deja de
        pedirse.
      </p>
      <MensajeError error={plantilla.error} />
      {plantilla.isLoading && <Cargando />}
      {plantilla.data?.map((s) => <SeccionEditable key={s.id} seccion={s} />)}
    </div>
  )
}

function SeccionEditable({ seccion: s }: { seccion: SeccionPlantilla }) {
  const qc = useQueryClient()
  const [nuevo, setNuevo] = useState('')
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['plantilla'] })
  const agregar = useMutation({
    mutationFn: () => agregarItem(s.id, nuevo),
    onSuccess: () => {
      setNuevo('')
      refrescar()
    },
  })

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <header className="bg-zinc-800 px-4 py-2 text-sm font-bold text-white uppercase">{s.nombre}</header>
      <ul className="divide-y divide-zinc-100">
        {s.items.map((i) => (
          <ItemEditable key={i.id} item={i} cantidad={s.tipoRespuesta === 'CANTIDAD'} onGuardado={refrescar} />
        ))}
      </ul>
      <form
        className="flex gap-2 border-t border-zinc-100 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (nuevo.trim()) agregar.mutate()
        }}
      >
        <Entrada className="min-h-9 text-sm" placeholder="Agregar ítem…" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
        <Boton type="submit" variante="secundario" className="min-h-9" cargando={agregar.isPending}>
          <Plus className="size-4" />
        </Boton>
      </form>
      {agregar.error && (
        <div className="px-3 pb-3">
          <MensajeError error={agregar.error} />
        </div>
      )}
    </section>
  )
}

function ItemEditable({ item: i, cantidad, onGuardado }: { item: ItemPlantilla; cantidad: boolean; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(i.nombre)
  const [debeHaber, setDebeHaber] = useState(i.debeHaber?.toString() ?? '')
  const guardar = useMutation({
    mutationFn: (cambios: CambiosItem) => actualizarItem(i.id, cambios),
    onSuccess: onGuardado,
  })
  const cambiado = nombre.trim() !== i.nombre || (cantidad && debeHaber !== (i.debeHaber?.toString() ?? ''))

  return (
    <li className={cx('flex flex-wrap items-center gap-2 px-4 py-2', !i.activo && 'bg-zinc-50 opacity-60')}>
      <Entrada className="min-h-9 min-w-48 flex-1 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {cantidad && (
        <Entrada
          className="min-h-9 w-24 text-sm"
          inputMode="numeric"
          placeholder="Debe haber"
          title="Debe haber (vacío: al menos 1)"
          value={debeHaber}
          onChange={(e) => setDebeHaber(e.target.value.replace(/\D/g, ''))}
        />
      )}
      {cambiado && (
        <Boton
          className="min-h-9"
          cargando={guardar.isPending}
          onClick={() =>
            guardar.mutate({ nombre: nombre.trim(), ...(cantidad ? { debeHaber: debeHaber === '' ? null : Number(debeHaber) } : {}) })
          }
        >
          Guardar
        </Boton>
      )}
      <Boton variante="fantasma" className="min-h-9 text-xs" onClick={() => guardar.mutate({ activo: !i.activo })}>
        {i.activo ? 'Desactivar' : 'Activar'}
      </Boton>
      {guardar.error && <p className="w-full text-xs text-red-700">{(guardar.error as Error).message}</p>}
    </li>
  )
}
