import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { EstadoControl } from '../lib/tipos'
import { NOMBRE_ESTADO } from '../lib/tipos'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type Variante = 'primario' | 'secundario' | 'peligro' | 'exito' | 'fantasma'
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-primary-foreground hover:bg-primary/85 disabled:bg-primary/50',
  secundario: 'bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50',
  peligro: 'bg-amber-600 text-white hover:bg-amber-700',
  exito: 'bg-emerald-600 text-white hover:bg-emerald-700',
  fantasma: 'text-zinc-700 hover:bg-zinc-200/60',
}

export function Boton({
  variante = 'primario',
  cargando,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        className,
      )}
    >
      {cargando && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-zinc-500">{ayuda}</span>}
    </label>
  )
}

const claseInput =
  'block min-h-11 w-full rounded-lg border-0 bg-white px-3 text-base ring-1 ring-zinc-300 focus:ring-2 focus:ring-marca-600 focus:outline-none'

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(claseInput, props.className)} />
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(claseInput, props.className)} />
}

export function AreaTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(claseInput, 'py-2', props.className)} />
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200', className)}>{children}</div>
}

const COLOR_ESTADO: Record<EstadoControl, string> = {
  PENDIENTE: 'bg-sky-100 text-sky-800',
  APROBADO: 'bg-emerald-100 text-emerald-800',
  OBSERVADO: 'bg-amber-100 text-amber-800',
}

export function EtiquetaEstado({ estado }: { estado: EstadoControl }) {
  return (
    <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', COLOR_ESTADO[estado])}>
      {NOMBRE_ESTADO[estado]}
    </span>
  )
}

export function EtiquetaFallas({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return <span className="text-xs font-medium text-emerald-700">Sin fallas</span>
  return (
    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
      {cantidad} {cantidad === 1 ? 'falla' : 'fallas'}
    </span>
  )
}

export function Cargando() {
  return (
    <div className="flex justify-center py-12 text-zinc-500">
      <Loader2 className="size-6 animate-spin" />
    </div>
  )
}

export function MensajeError({ error }: { error: unknown }) {
  if (!error) return null
  const mensaje = error instanceof Error ? error.message : 'Error inesperado'
  const lista = listaDe(error)
  return (
    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
      <p className="font-semibold">{mensaje}</p>
      {lista.length > 0 && (
        <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5">
          {lista.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Botones tipo "segmento" para elegir una opción con el pulgar. */
export function Segmentos<T extends string>({
  opciones,
  valor,
  onChange,
  colores,
}: {
  opciones: { valor: T; nombre: string }[]
  valor: T | null | undefined
  onChange: (v: T | null) => void
  colores?: Partial<Record<T, string>>
}) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 ring-1 ring-zinc-200">
      {opciones.map((o) => {
        const activo = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onChange(activo ? null : o.valor)}
            className={cx(
              'min-h-9 min-w-10 rounded-md px-2 text-xs font-bold transition',
              activo ? (colores?.[o.valor] ?? 'bg-zinc-800 text-white') : 'text-zinc-600 hover:bg-white',
            )}
          >
            {o.nombre}
          </button>
        )
      })}
    </div>
  )
}

/** Detalle por ítem de los errores (ErrorDatos.lista), sin acoplar ui a lib/datos. */
function listaDe(error: unknown): string[] {
  const l = (error as { lista?: unknown }).lista
  return Array.isArray(l) ? l.map(String) : []
}
