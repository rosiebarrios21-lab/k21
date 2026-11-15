/**
 * Componentes compartidos de las pantallas internas. Usan los colores del tema (src/index.css),
 * igual que los componentes de shadcn en components/ui/, para que toda la app se vea pareja.
 * Los colores con significado (verde = bien, rojo = falla, ámbar = observado) son fijos a propósito.
 */
import { AlertCircle, Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { EstadoControl } from '../lib/tipos'
import { NOMBRE_ESTADO } from '../lib/tipos'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

const FOCO = 'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type Variante = 'primario' | 'secundario' | 'peligro' | 'exito' | 'fantasma'
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/85',
  secundario: 'border-border bg-card text-foreground shadow-xs hover:bg-muted',
  peligro: 'bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-600',
  exito: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
  fantasma: 'text-foreground/80 hover:bg-muted hover:text-foreground',
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 text-sm font-semibold transition-all select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
        FOCO,
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
      <span className="mb-1.5 block text-sm font-medium text-foreground">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-muted-foreground">{ayuda}</span>}
    </label>
  )
}

const claseInput = cx(
  'block min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base transition-colors placeholder:text-muted-foreground',
  'disabled:cursor-not-allowed disabled:opacity-50',
  FOCO,
)

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(claseInput, props.className)} />
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(claseInput, 'pr-8', props.className)} />
}

export function AreaTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(claseInput, 'py-2', props.className)} />
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm', className)}>{children}</div>
}

/** Encabezado oscuro de cada sección de planilla, con el filete amarillo de la marca. */
export const claseEncabezadoSeccion = 'border-l-4 border-primary bg-foreground text-background'

const COLOR_ESTADO: Record<EstadoControl, string> = {
  PENDIENTE: 'bg-sky-100 text-sky-800 ring-sky-200',
  APROBADO: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  OBSERVADO: 'bg-amber-100 text-amber-900 ring-amber-200',
}

export function EtiquetaEstado({ estado }: { estado: EstadoControl }) {
  return (
    <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', COLOR_ESTADO[estado])}>
      {NOMBRE_ESTADO[estado]}
    </span>
  )
}

export function EtiquetaFallas({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return <span className="text-xs font-medium text-emerald-700">Sin fallas</span>
  return (
    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 ring-inset">
      {cantidad} {cantidad === 1 ? 'falla' : 'fallas'}
    </span>
  )
}

export function Cargando() {
  return (
    <div className="flex justify-center py-12 text-muted-foreground" role="status" aria-label="Cargando">
      <Loader2 className="size-6 animate-spin" />
    </div>
  )
}

export function MensajeError({ error }: { error: unknown }) {
  if (!error) return null
  const mensaje = error instanceof Error ? error.message : 'Error inesperado'
  const lista = listaDe(error)
  return (
    <div role="alert" className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{mensaje}</p>
        {lista.length > 0 && (
          <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5 text-destructive/90">
            {lista.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </div>
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
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {opciones.map((o) => {
        const activo = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(activo ? null : o.valor)}
            className={cx(
              'min-h-9 min-w-10 rounded-md px-2 text-xs font-bold transition',
              FOCO,
              activo ? (colores?.[o.valor] ?? 'bg-foreground text-background shadow-sm') : 'text-muted-foreground hover:bg-card hover:text-foreground',
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
