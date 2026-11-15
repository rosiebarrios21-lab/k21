import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Package, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { Cargando, EtiquetaEstado, EtiquetaFallas, MensajeError, Tarjeta } from '../components/ui'
import { obtenerResumen } from '../lib/datos'
import { useSesion } from '../lib/sesion'
import type { EstadoControl, TipoControl, UltimoControl } from '../lib/tipos'
import { fechaCorta, NOMBRE_TIPO, tiposQuePuedeCargar } from '../lib/tipos'

const ICONO: Record<TipoControl, typeof Wrench> = { MECANICO: Wrench, MATERIAL: Package }
const DESCRIPCION: Record<TipoControl, string> = {
  MECANICO: 'Luces, sirenas, neumáticos, frenos, motor y documentación del móvil',
  MATERIAL: 'Kits de heridas, vías aéreas, quemaduras, obstétrico, evaluación e inmovilización',
}

export function Inicio() {
  const usuario = useSesion((s) => s.usuario)!
  const resumen = useQuery({ queryKey: ['resumen'], queryFn: obtenerResumen })
  const contar = (estado: EstadoControl, tipo?: TipoControl) =>
    resumen.data?.conteos.filter((c) => c.estado === estado && (!tipo || c.tipo === tipo)).reduce((a, c) => a + c.cantidad, 0) ?? 0

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Nuevo control</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiposQuePuedeCargar(usuario.rol).map((tipo) => {
            const Icono = ICONO[tipo]
            return (
              <Link
                key={tipo}
                to={`/controles/nuevo/${tipo.toLowerCase()}`}
                className="flex items-center gap-4 rounded-xl bg-primary p-4 text-primary-foreground shadow-sm transition hover:bg-primary/85 active:scale-[.99]"
              >
                <Icono className="size-9 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{NOMBRE_TIPO[tipo]}</p>
                  <p className="text-sm text-primary-foreground/75">{DESCRIPCION[tipo]}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {resumen.isLoading && <Cargando />}
      <MensajeError error={resumen.error} />

      {resumen.data && (
        <>
          <section className="grid grid-cols-3 gap-3">
            {(
              [
                ['PENDIENTE', usuario.rol === 'ADMIN' ? 'Por revisar' : 'En revisión'],
                ['OBSERVADO', 'Observados'],
                ['APROBADO', 'Aprobados'],
              ] as const
            ).map(([estado, nombre]) => (
              <Link key={estado} to={`/controles?estado=${estado}`}>
                <Tarjeta className="text-center transition hover:ring-input">
                  <p className="text-3xl font-black">{contar(estado)}</p>
                  <p className="text-xs font-medium text-muted-foreground">{nombre}</p>
                </Tarjeta>
              </Link>
            ))}
          </section>

          {usuario.rol !== 'ADMIN' && contar('OBSERVADO') > 0 && (
            <Link to="/controles?estado=OBSERVADO" className="block rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              Tenés <b>{contar('OBSERVADO')}</b> control(es) observado(s) por el administrador. Revisalos y corregí lo indicado.
            </Link>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Estado de los móviles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {resumen.data.moviles.map((m) => (
                <Tarjeta key={m.id}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <p className="text-lg font-black">{m.codigo}</p>
                    {m.descripcion && <p className="text-sm text-muted-foreground">{m.descripcion}</p>}
                  </div>
                  <div className="space-y-2">
                    <Ultimo tipo="MECANICO" control={m.mecanico} />
                    <Ultimo tipo="MATERIAL" control={m.material} />
                  </div>
                </Tarjeta>
              ))}
              {resumen.data.moviles.length === 0 && <p className="text-sm text-muted-foreground">No hay móviles activos.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Ultimo({ tipo, control }: { tipo: TipoControl; control: UltimoControl | null }) {
  const contenido = (
    // En el celular: nombre arriba, fecha y etiquetas abajo. Desde sm, todo en una línea.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted">
      <ClipboardCheck className="size-4 shrink-0 text-muted-foreground/70" />
      <span className="flex-1 font-medium whitespace-nowrap">{NOMBRE_TIPO[tipo]}</span>
      {control ? (
        <span className="flex w-full items-center gap-2 pl-6 whitespace-nowrap sm:w-auto sm:pl-0">
          <span className="text-xs text-muted-foreground">{fechaCorta(control.fecha)}</span>
          <EtiquetaFallas cantidad={control.cantidadFallas} />
          <EtiquetaEstado estado={control.estado} />
        </span>
      ) : (
        <span className="text-xs text-muted-foreground/70">Sin controles</span>
      )}
    </div>
  )
  return control ? <Link to={`/controles/${control.id}`}>{contenido}</Link> : contenido
}
