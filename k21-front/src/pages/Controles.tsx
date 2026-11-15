import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Boton, Cargando, Entrada, EtiquetaEstado, EtiquetaFallas, MensajeError, Selector, Tarjeta } from '../components/ui'
import { listarControles, listarMoviles } from '../lib/datos'
import { useSesion } from '../lib/sesion'
import { fechaCorta, NOMBRE_ESTADO, NOMBRE_TIPO } from '../lib/tipos'

export function Controles() {
  const rol = useSesion((s) => s.usuario!.rol)
  const [params, setParams] = useSearchParams()
  const pagina = Number(params.get('pagina') ?? 1)
  const filtro = (k: string) => params.get(k) ?? ''
  const setFiltro = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    p.delete('pagina')
    setParams(p, { replace: true })
  }

  const moviles = useQuery({ queryKey: ['moviles'], queryFn: () => listarMoviles() })
  const consulta = new URLSearchParams([...params].filter(([, v]) => v)).toString()
  const lista = useQuery({
    queryKey: ['controles', consulta],
    queryFn: () =>
      listarControles({
        tipo: filtro('tipo'),
        estado: filtro('estado'),
        movilId: filtro('movilId'),
        desde: filtro('desde'),
        hasta: filtro('hasta'),
        pagina,
      }),
    placeholderData: keepPreviousData,
  })
  const paginas = lista.data ? Math.max(1, Math.ceil(lista.data.total / lista.data.porPagina)) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{rol === 'ADMIN' ? 'Controles' : 'Mis controles'}</h1>

      <Tarjeta className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Selector value={filtro('estado')} onChange={(e) => setFiltro('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(NOMBRE_ESTADO).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </Selector>
        <Selector value={filtro('tipo')} onChange={(e) => setFiltro('tipo', e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(NOMBRE_TIPO).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </Selector>
        <Selector value={filtro('movilId')} onChange={(e) => setFiltro('movilId', e.target.value)}>
          <option value="">Todos los móviles</option>
          {moviles.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.codigo}
            </option>
          ))}
        </Selector>
        <Entrada type="date" title="Desde" value={filtro('desde')} onChange={(e) => setFiltro('desde', e.target.value)} />
        <Entrada type="date" title="Hasta" value={filtro('hasta')} onChange={(e) => setFiltro('hasta', e.target.value)} />
      </Tarjeta>

      <MensajeError error={lista.error} />
      {lista.isLoading && <Cargando />}

      {lista.data && (
        <>
          <ul className="space-y-2">
            {lista.data.filas.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/controles/${c.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 transition hover:ring-zinc-300"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-zinc-100 text-xs font-black">{c.movil.codigo}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {NOMBRE_TIPO[c.tipo]} <span className="font-normal text-zinc-500">· Nº {c.numero}</span>
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {fechaCorta(c.fecha)} · {c.autor.nombre}
                      {c.servicio ? ` · ${c.servicio}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <EtiquetaEstado estado={c.estado} />
                      <EtiquetaFallas cantidad={c.cantidadFallas} />
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
          {lista.data.filas.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No hay controles con esos filtros.</p>}
          {paginas > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Boton variante="secundario" disabled={pagina <= 1} onClick={() => setParams((p) => (p.set('pagina', String(pagina - 1)), p))}>
                Anterior
              </Boton>
              <span className="text-sm text-zinc-600">
                {pagina} / {paginas}
              </span>
              <Boton
                variante="secundario"
                disabled={pagina >= paginas}
                onClick={() => setParams((p) => (p.set('pagina', String(pagina + 1)), p))}
              >
                Siguiente
              </Boton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
