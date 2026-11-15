import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronLeft, MessageSquareWarning, Pencil, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AreaTexto, Boton, Cargando, cx, EtiquetaEstado, EtiquetaFallas, MensajeError, Tarjeta } from '../components/ui'
import { obtenerControl, revisarControl } from '../lib/datos'
import { useSesion } from '../lib/sesion'
import type { ItemDetalle, TipoRespuesta } from '../lib/tipos'
import { ESTADOS_POR_TIPO, fechaCorta, NOMBRE_NIVEL, NOMBRE_ROL, NOMBRE_TIPO } from '../lib/tipos'

function textoRespuesta(tipo: TipoRespuesta, i: ItemDetalle) {
  if (tipo === 'CANTIDAD') return `${i.existente ?? '—'}`
  const partes: string[] = [i.respuesta === 'NA' ? 'N/A' : (i.respuesta ?? '—')]
  if (i.estado) partes.push(ESTADOS_POR_TIPO[tipo].find((e) => e.valor === i.estado)?.nombre ?? i.estado)
  if (i.nivel) partes.push(NOMBRE_NIVEL[i.nivel])
  return partes.join(' · ')
}

export function ControlDetallePagina() {
  const { id } = useParams()
  const usuario = useSesion((s) => s.usuario)!
  const qc = useQueryClient()
  const [soloFallas, setSoloFallas] = useState(false)
  const [comentario, setComentario] = useState('')
  const [observando, setObservando] = useState(false)

  const control = useQuery({ queryKey: ['control', id], queryFn: () => obtenerControl(id!) })
  const revisar = useMutation({
    mutationFn: (estado: 'APROBADO' | 'OBSERVADO') => revisarControl(id!, estado, comentario),
    onSuccess: () => {
      setObservando(false)
      setComentario('')
      void qc.invalidateQueries({ queryKey: ['control', id] })
      void qc.invalidateQueries({ queryKey: ['controles'] })
      void qc.invalidateQueries({ queryKey: ['resumen'] })
    },
  })

  if (control.isLoading) return <Cargando />
  if (control.error || !control.data) return <MensajeError error={control.error} />
  const c = control.data
  const esAutor = c.autor.id === usuario.id
  const puedeEditar = esAutor && c.estado !== 'APROBADO'
  const enc = c.encabezado

  const datos: [string, string | null | undefined][] = [
    ['Móvil', `${c.movil.codigo}${c.movil.descripcion ? ` · ${c.movil.descripcion}` : ''}`],
    ['Fecha', fechaCorta(c.fecha)],
    ['Servicio', c.servicio],
    ['Cargado por', `${c.autor.nombre}${c.autor.codigo ? ` (${c.autor.codigo})` : ''} · ${NOMBRE_ROL[c.autor.rol]}`],
    ...(c.tipo === 'MECANICO'
      ? ([
          ['A cargo de la compañía', enc.aCargoCompania],
          ['Grupo / Nº', [enc.grupo, enc.numero].filter(Boolean).join(' / ') || null],
          ['Combustible', enc.combustible ? NOMBRE_NIVEL[enc.combustible] : null],
        ] as [string, string | null | undefined][])
      : ([
          ['A cargo del móvil', enc.aCargoMovil],
          ['Control realizado también por', enc.controlAcompanante],
        ] as [string, string | null | undefined][])),
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/controles" className="rounded-md p-1.5 hover:bg-zinc-200 print:hidden">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-xl font-bold">
          {NOMBRE_TIPO[c.tipo]} <span className="text-zinc-500">· Nº {c.numero}</span>
        </h1>
        <EtiquetaEstado estado={c.estado} />
        <EtiquetaFallas cantidad={c.cantidadFallas} />
      </div>

      {c.estado !== 'PENDIENTE' && c.revisor && (
        <div
          className={cx(
            'rounded-xl p-4 text-sm ring-1',
            c.estado === 'APROBADO' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-200',
          )}
        >
          <p className="font-semibold">
            {c.estado === 'APROBADO' ? 'Aprobado' : 'Observado'} por {c.revisor.nombre}
            {c.revisadoEl && ` el ${new Date(c.revisadoEl).toLocaleString('es-PY')}`}
          </p>
          {c.comentarioRevision && <p className="mt-1 whitespace-pre-line">{c.comentarioRevision}</p>}
        </div>
      )}
      {c.estado === 'PENDIENTE' && c.comentarioRevision && (
        <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
          <p className="font-semibold">Reenviado tras esta observación anterior:</p>
          <p className="whitespace-pre-line">{c.comentarioRevision}</p>
        </div>
      )}

      <Tarjeta>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {datos
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
        </dl>
        {c.observacion && (
          <div className="mt-3 border-t border-zinc-100 pt-3 text-sm">
            <p className="text-xs text-zinc-500">Observación</p>
            <p className="whitespace-pre-line">{c.observacion}</p>
          </div>
        )}
      </Tarjeta>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-marca-700" checked={soloFallas} onChange={(e) => setSoloFallas(e.target.checked)} />
          Mostrar solo fallas
        </label>
        <div className="flex-1" />
        <Boton variante="fantasma" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir
        </Boton>
        {puedeEditar && (
          <Link to={`/controles/${c.id}/editar`}>
            <Boton variante="secundario">
              <Pencil className="size-4" /> Corregir
            </Boton>
          </Link>
        )}
      </div>

      {c.secciones.map((s) => {
        const items = soloFallas ? s.items.filter((i) => i.falla) : s.items
        if (items.length === 0) return null
        return (
          <section key={s.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 print:break-inside-avoid">
            <header className="flex items-center bg-zinc-800 px-4 py-2 text-white">
              <h2 className="flex-1 text-sm font-bold uppercase">{s.nombre}</h2>
              {s.tipoRespuesta === 'CANTIDAD' && <span className="text-[11px] text-white/70">DEBE HABER / EXISTENTE</span>}
            </header>
            <ul className="divide-y divide-zinc-100">
              {items.map((i) => (
                <li key={i.itemId} className={cx('flex items-start gap-3 px-4 py-2 text-sm', i.falla && 'bg-red-50')}>
                  {i.falla ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cx(i.falla && 'font-semibold text-red-800')}>{i.nombre}</p>
                    {i.nota && <p className="text-xs text-red-700">{i.nota}</p>}
                  </div>
                  <span className={cx('text-right font-semibold whitespace-nowrap', i.falla ? 'text-red-700' : 'text-zinc-700')}>
                    {s.tipoRespuesta === 'CANTIDAD' && (
                      <span className="font-normal text-zinc-500">
                        {i.debeHaber ?? '—'}
                        {i.unidad ? ` ${i.unidad}` : ''} /{' '}
                      </span>
                    )}
                    {textoRespuesta(s.tipoRespuesta, i)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {usuario.rol === 'ADMIN' && c.estado === 'PENDIENTE' && (
        <Tarjeta className="space-y-3 print:hidden">
          <h2 className="font-bold">Verificación</h2>
          {observando ? (
            <>
              <AreaTexto
                autoFocus
                placeholder="Indicá qué hay que corregir o reponer…"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={1000}
              />
              <MensajeError error={revisar.error} />
              <div className="flex gap-2">
                <Boton variante="secundario" onClick={() => setObservando(false)}>
                  Cancelar
                </Boton>
                <Boton variante="peligro" disabled={!comentario.trim()} cargando={revisar.isPending} onClick={() => revisar.mutate('OBSERVADO')}>
                  <MessageSquareWarning className="size-4" /> Devolver con observación
                </Boton>
              </div>
            </>
          ) : (
            <>
              <AreaTexto
                placeholder="Comentario (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={1000}
              />
              <MensajeError error={revisar.error} />
              <div className="flex flex-wrap gap-2">
                <Boton variante="exito" cargando={revisar.isPending} onClick={() => revisar.mutate('APROBADO')}>
                  <CheckCircle2 className="size-4" /> Aprobar
                </Boton>
                <Boton variante="peligro" onClick={() => setObservando(true)}>
                  <MessageSquareWarning className="size-4" /> Observar
                </Boton>
              </div>
            </>
          )}
        </Tarjeta>
      )}
    </div>
  )
}
