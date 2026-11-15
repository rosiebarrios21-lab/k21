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
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Nuevo control</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiposQuePuedeCargar(usuario.rol).map((tipo) => {
            const Icono = ICONO[tipo]
            return (
              <Link
                key={tipo}
                to={`/controles/nuevo/${tipo.toLowerCase()}`}
                className="flex items-center gap-4 rounded-xl bg-marca-700 p-4 text-white shadow-sm transition hover:bg-marca-800 active:scale-[.99]"
              >
                <Icono className="size-9 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{NOMBRE_TIPO[tipo]}</p>
                  <p className="text-sm text-white/80">{DESCRIPCION[tipo]}</p>
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
                <Tarjeta className="text-center transition hover:ring-zinc-300">
                  <p className="text-3xl font-black">{contar(estado)}</p>
                  <p className="text-xs font-medium text-zinc-600">{nombre}</p>
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
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Estado de los móviles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {resumen.data.moviles.map((m) => (
                <Tarjeta key={m.id}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <p className="text-lg font-black">{m.codigo}</p>
                    {m.descripcion && <p className="text-sm text-zinc-500">{m.descripcion}</p>}
                  </div>
                  <div className="space-y-2">
                    <Ultimo tipo="MECANICO" control={m.mecanico} />
                    <Ultimo tipo="MATERIAL" control={m.material} />
                  </div>
                </Tarjeta>
              ))}
              {resumen.data.moviles.length === 0 && <p className="text-sm text-zinc-500">No hay móviles activos.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Ultimo({ tipo, control }: { tipo: TipoControl; control: UltimoControl | null }) {
  const contenido = (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
      <ClipboardCheck className="size-4 shrink-0 text-zinc-400" />
      <span className="flex-1 font-medium">{NOMBRE_TIPO[tipo]}</span>
      {control ? (
        <>
          <span className="text-xs text-zinc-500">{fechaCorta(control.fecha)}</span>
          <EtiquetaFallas cantidad={control.cantidadFallas} />
          <EtiquetaEstado estado={control.estado} />
        </>
      ) : (
        <span className="text-xs text-zinc-400">Sin controles</span>
      )}
    </div>
  )
  return control ? <Link to={`/controles/${control.id}`}>{contenido}</Link> : contenido
}
