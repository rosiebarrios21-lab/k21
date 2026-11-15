import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronRight, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import type { ReactNode } from 'react'
import { Boton, Cargando, cx, Entrada, EtiquetaEstado, EtiquetaFallas, MensajeError, Selector, Tarjeta } from '../components/ui'
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

      <Tarjeta className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Filtro etiqueta="Estado">
          <Selector value={filtro('estado')} onChange={(e) => setFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ESTADO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Tipo">
          <Selector value={filtro('tipo')} onChange={(e) => setFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_TIPO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Móvil" className="col-span-2 sm:col-span-1">
          <Selector value={filtro('movilId')} onChange={(e) => setFiltro('movilId', e.target.value)}>
            <option value="">Todos</option>
            {moviles.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Desde">
          <Entrada type="date" value={filtro('desde')} onChange={(e) => setFiltro('desde', e.target.value)} />
        </Filtro>
        <Filtro etiqueta="Hasta">
          <Entrada type="date" value={filtro('hasta')} onChange={(e) => setFiltro('hasta', e.target.value)} />
        </Filtro>
        {[...params.keys()].some((k) => k !== 'pagina') && (
          <div className="col-span-2 flex justify-end sm:col-span-5">
            <Boton variante="fantasma" className="min-h-9 text-xs" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              <X className="size-4" /> Limpiar filtros
            </Boton>
          </div>
        )}
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
                  className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-border transition hover:ring-input"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-xs font-black">{c.movil.codigo}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {NOMBRE_TIPO[c.tipo]} <span className="font-normal text-muted-foreground">· Nº {c.numero}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fechaCorta(c.fecha)} · {c.autor.nombre}
                      {c.servicio ? ` · ${c.servicio}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <EtiquetaEstado estado={c.estado} />
                      <EtiquetaFallas cantidad={c.cantidadFallas} />
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground/70" />
                </Link>
              </li>
            ))}
          </ul>
          {lista.data.filas.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No hay controles con esos filtros.</p>}
          {paginas > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Boton variante="secundario" disabled={pagina <= 1} onClick={() => setParams((p) => (p.set('pagina', String(pagina - 1)), p))}>
                Anterior
              </Boton>
              <span className="text-sm text-muted-foreground">
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

function Filtro({ etiqueta, className, children }: { etiqueta: string; className?: string; children: ReactNode }) {
  return (
    <label className={cx('block min-w-0', className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{etiqueta}</span>
      {children}
    </label>
  )
}
