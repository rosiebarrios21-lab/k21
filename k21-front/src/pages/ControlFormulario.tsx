import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCheck, ChevronLeft, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AreaTexto,
  Boton,
  Campo,
  Cargando,
  cx,
  Entrada,
  MensajeError,
  Segmentos,
  Selector,
  Tarjeta,
} from '../components/ui'
import { guardarControl, listarMoviles, obtenerControl, obtenerPlantilla } from '../lib/datos'
import { esFalla, respondido, respuestaOk } from '../lib/reglas'
import { useSesion } from '../lib/sesion'
import type {
  EncabezadoMaterial,
  EncabezadoMecanico,
  Estado,
  Nivel,
  Respuesta,
  RespuestaItem,
  SeccionPlantilla,
  TipoControl,
} from '../lib/tipos'
import { ESTADOS_POR_TIPO, hoyIso, NOMBRE_NIVEL, NOMBRE_TIPO, tiposQuePuedeCargar } from '../lib/tipos'

interface Formulario {
  movilId: string
  fecha: string
  servicio: string
  observacion: string
  encabezado: EncabezadoMecanico & EncabezadoMaterial
  respuestas: Record<string, RespuestaItem>
}

const vacio = (): Formulario => ({ movilId: '', fecha: hoyIso(), servicio: '', observacion: '', encabezado: {}, respuestas: {} })
const claveBorrador = (tipo: TipoControl) => `k21-borrador-${tipo}`

function leerBorrador(tipo: TipoControl): Formulario | null {
  try {
    const raw = localStorage.getItem(claveBorrador(tipo))
    return raw ? { ...vacio(), ...JSON.parse(raw), fecha: hoyIso() } : null
  } catch {
    return null
  }
}

const OPCIONES_RESPUESTA: { valor: Respuesta; nombre: string }[] = [
  { valor: 'SI', nombre: 'SI' },
  { valor: 'NO', nombre: 'NO' },
  { valor: 'NA', nombre: 'N/A' },
]
const COLOR_RESPUESTA = { SI: 'bg-emerald-600 text-white', NO: 'bg-red-600 text-white', NA: 'bg-muted-foreground text-white' }
const COLOR_ESTADO = { B: 'bg-emerald-600 text-white', R: 'bg-amber-500 text-white', M: 'bg-red-600 text-white', I: 'bg-red-800 text-white' }
const COLOR_NIVEL = { F: 'bg-emerald-600 text-white', M: 'bg-amber-500 text-white', R: 'bg-red-600 text-white' }
const OPCIONES_NIVEL = (['R', 'M', 'F'] as const).map((v) => ({ valor: v, nombre: v }))

export function ControlFormulario() {
  const { id, tipo: tipoParam } = useParams()
  const navegar = useNavigate()
  const qc = useQueryClient()
  const rol = useSesion((s) => s.usuario!.rol)

  const existente = useQuery({
    queryKey: ['control', id],
    queryFn: () => obtenerControl(id!),
    enabled: !!id,
  })
  const tipo = (id ? existente.data?.tipo : tipoParam?.toUpperCase()) as TipoControl | undefined

  const plantilla = useQuery({
    queryKey: ['plantilla', tipo],
    queryFn: () => obtenerPlantilla(tipo!),
    enabled: !!tipo,
  })
  const moviles = useQuery({ queryKey: ['moviles'], queryFn: () => listarMoviles() })

  const [form, setForm] = useState<Formulario | null>(null)

  // Estado inicial: el control a corregir, o el borrador guardado, o vacío.
  useEffect(() => {
    if (form || !tipo) return
    if (id) {
      const c = existente.data
      if (!c) return
      const respuestas: Record<string, RespuestaItem> = {}
      for (const s of c.secciones) for (const it of s.items) respuestas[it.itemId] = { ...it }
      setForm({
        movilId: c.movil.id,
        fecha: c.fecha.slice(0, 10),
        servicio: c.servicio ?? '',
        observacion: c.observacion ?? '',
        encabezado: c.encabezado,
        respuestas,
      })
    } else {
      setForm(leerBorrador(tipo) ?? vacio())
    }
  }, [id, tipo, existente.data, form])

  // Si hay un solo móvil, se elige solo.
  useEffect(() => {
    if (form && !form.movilId && moviles.data?.length === 1) setForm({ ...form, movilId: moviles.data[0]!.id })
  }, [form, moviles.data])

  // Borrador local para no perder lo cargado si se cierra la app o se corta la señal.
  useEffect(() => {
    if (!id && tipo && form) localStorage.setItem(claveBorrador(tipo), JSON.stringify(form))
  }, [id, tipo, form])

  const total = useMemo(() => plantilla.data?.reduce((a, s) => a + s.items.length, 0) ?? 0, [plantilla.data])
  const completos = useMemo(
    () =>
      plantilla.data?.reduce((a, s) => a + s.items.filter((i) => respondido(s.tipoRespuesta, form?.respuestas[i.id])).length, 0) ?? 0,
    [plantilla.data, form],
  )
  const fallas = useMemo(
    () => plantilla.data?.reduce((a, s) => a + s.items.filter((i) => esFalla(s.tipoRespuesta, i, form?.respuestas[i.id])).length, 0) ?? 0,
    [plantilla.data, form],
  )

  const guardar = useMutation({
    mutationFn: () => {
      const f = form!
      const body = {
        tipo: tipo!,
        movilId: f.movilId,
        fecha: f.fecha,
        servicio: f.servicio,
        observacion: f.observacion,
        encabezado: f.encabezado,
        items: plantilla.data!.flatMap((s) =>
          s.items.map((i) => {
            const r = f.respuestas[i.id] ?? {}
            return {
              itemId: i.id,
              respuesta: r.respuesta ?? null,
              estado: r.estado ?? null,
              nivel: r.nivel ?? null,
              existente: r.existente ?? null,
              nota: r.nota ?? null,
            }
          }),
        ),
      }
      return guardarControl(id, body)
    },
    onSuccess: (r) => {
      if (!id && tipo) localStorage.removeItem(claveBorrador(tipo))
      void qc.invalidateQueries({ queryKey: ['controles'] })
      void qc.invalidateQueries({ queryKey: ['resumen'] })
      void qc.invalidateQueries({ queryKey: ['control', r.id] })
      navegar(`/controles/${r.id}`, { replace: true })
    },
  })

  if (tipo && !id && !tiposQuePuedeCargar(rol).includes(tipo)) {
    return <MensajeError error={new Error('Tu rol no carga este tipo de control')} />
  }
  if (existente.error || plantilla.error || moviles.error) {
    return <MensajeError error={existente.error ?? plantilla.error ?? moviles.error} />
  }
  if (!tipo || !form || !plantilla.data || !moviles.data) return <Cargando />

  const set = (cambios: Partial<Formulario>) => setForm({ ...form, ...cambios })
  const setEnc = (cambios: Partial<Formulario['encabezado']>) => set({ encabezado: { ...form.encabezado, ...cambios } })
  const setResp = (itemId: string, cambios: Partial<RespuestaItem>) =>
    set({ respuestas: { ...form.respuestas, [itemId]: { ...form.respuestas[itemId], ...cambios, itemId } } })

  const completarSeccion = (s: SeccionPlantilla) => {
    const respuestas = { ...form.respuestas }
    for (const i of s.items) if (!respondido(s.tipoRespuesta, respuestas[i.id])) respuestas[i.id] = respuestaOk(s.tipoRespuesta, i)
    set({ respuestas })
  }

  const listo = completos === total && !!form.movilId && !!form.fecha

  return (
    <form
      className="space-y-4 pb-24"
      onSubmit={(e) => {
        e.preventDefault()
        guardar.mutate()
      }}
    >
      <div className="flex items-center gap-2">
        <Link to={id ? `/controles/${id}` : '/inicio'} className="rounded-md p-1.5 hover:bg-muted">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">
          {NOMBRE_TIPO[tipo]}
          {existente.data && <span className="text-muted-foreground"> · Nº {existente.data.numero}</span>}
        </h1>
      </div>

      {existente.data?.estado === 'OBSERVADO' && existente.data.comentarioRevision && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Observación del administrador:</p>
          <p className="whitespace-pre-line">{existente.data.comentarioRevision}</p>
        </div>
      )}

      <Tarjeta className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Móvil">
          <Selector value={form.movilId} onChange={(e) => set({ movilId: e.target.value })} required>
            <option value="">Elegí un móvil…</option>
            {moviles.data.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo}
                {m.descripcion ? ` · ${m.descripcion}` : ''}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Fecha">
          <Entrada type="date" value={form.fecha} max={hoyIso()} onChange={(e) => set({ fecha: e.target.value })} required />
        </Campo>
        <Campo etiqueta="Servicio" ayuda="Opcional: número o descripción del servicio / salida">
          <Entrada value={form.servicio} onChange={(e) => set({ servicio: e.target.value })} maxLength={100} />
        </Campo>
        {tipo === 'MECANICO' ? (
          <>
            <Campo etiqueta="A cargo de la compañía">
              <Entrada value={form.encabezado.aCargoCompania ?? ''} onChange={(e) => setEnc({ aCargoCompania: e.target.value })} maxLength={100} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Grupo">
                <Entrada value={form.encabezado.grupo ?? ''} onChange={(e) => setEnc({ grupo: e.target.value })} maxLength={30} />
              </Campo>
              <Campo etiqueta="Nº">
                <Entrada value={form.encabezado.numero ?? ''} onChange={(e) => setEnc({ numero: e.target.value })} maxLength={30} />
              </Campo>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/80">Nivel de combustible</span>
              <Segmentos
                opciones={(['R', 'M', 'F'] as const).map((v) => ({ valor: v, nombre: NOMBRE_NIVEL[v] }))}
                valor={form.encabezado.combustible}
                onChange={(v) => setEnc({ combustible: v as Nivel | null })}
                colores={COLOR_NIVEL}
              />
            </div>
          </>
        ) : (
          <>
            <Campo etiqueta="A cargo del móvil" ayuda="Nombre y código del chofer a cargo">
              <Entrada value={form.encabezado.aCargoMovil ?? ''} onChange={(e) => setEnc({ aCargoMovil: e.target.value })} maxLength={100} />
            </Campo>
            <Campo etiqueta="Control realizado también por" ayuda="Opcional: código VK21 del compañero">
              <Entrada
                value={form.encabezado.controlAcompanante ?? ''}
                onChange={(e) => setEnc({ controlAcompanante: e.target.value })}
                maxLength={100}
              />
            </Campo>
          </>
        )}
      </Tarjeta>

      {tipo === 'MECANICO' && (
        <p className="px-1 text-xs text-muted-foreground">
          N/A: No aplica · B: Bueno · R: Regular · M: Malo. Marcá lo que corresponda; con "Todo OK" completás lo que falta de
          una sección.
        </p>
      )}

      {plantilla.data.map((s) => (
        <Seccion key={s.id} seccion={s} respuestas={form.respuestas} onCambio={setResp} onTodoOk={() => completarSeccion(s)} />
      ))}

      <Tarjeta>
        <Campo etiqueta="Observación">
          <AreaTexto value={form.observacion} onChange={(e) => set({ observacion: e.target.value })} maxLength={1000} />
        </Campo>
      </Tarjeta>

      <MensajeError error={guardar.error} />

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              {completos}/{total} ítems
            </p>
            {fallas > 0 ? (
              <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="size-3.5" /> {fallas} con falla
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{listo ? 'Listo para enviar' : 'Completá todos los ítems'}</p>
            )}
          </div>
          <Boton type="submit" disabled={!listo} cargando={guardar.isPending}>
            {id ? 'Reenviar' : 'Enviar a revisión'}
          </Boton>
        </div>
      </div>
    </form>
  )
}

function Seccion({
  seccion: s,
  respuestas,
  onCambio,
  onTodoOk,
}: {
  seccion: SeccionPlantilla
  respuestas: Record<string, RespuestaItem>
  onCambio: (itemId: string, c: Partial<RespuestaItem>) => void
  onTodoOk: () => void
}) {
  const hechos = s.items.filter((i) => respondido(s.tipoRespuesta, respuestas[i.id])).length
  const estados = ESTADOS_POR_TIPO[s.tipoRespuesta]

  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
      <header className="flex items-center gap-2 border-l-4 border-primary bg-foreground px-4 py-2.5 text-background">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase">{s.nombre}</h2>
          {s.nota && <p className="text-xs text-background/70">{s.nota}</p>}
        </div>
        <span className={cx('text-xs font-semibold', hechos === s.items.length ? 'text-emerald-300' : 'text-background/70')}>
          {hechos}/{s.items.length}
        </span>
        {hechos < s.items.length && (
          <button type="button" onClick={onTodoOk} className="flex items-center gap-1 rounded-md bg-background/15 px-2 py-1 text-xs font-semibold hover:bg-background/25">
            <CheckCheck className="size-3.5" /> Todo OK
          </button>
        )}
      </header>

      {s.tipoRespuesta === 'CANTIDAD' && (
        <div className="flex border-b border-border/60 px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase">
          <span className="flex-1">Ítem</span>
          <span className="w-20 text-center">Debe haber</span>
          <span className="w-32 text-center">Existente</span>
        </div>
      )}

      <ul className="divide-y divide-border/60">
        {s.items.map((i) => {
          const r = respuestas[i.id]
          const falla = esFalla(s.tipoRespuesta, i, r)
          return (
            <li key={i.id} className={cx('px-4 py-2.5', falla && 'bg-red-50')}>
              {s.tipoRespuesta === 'CANTIDAD' ? (
                <div className="flex items-center gap-2">
                  <span className={cx('flex-1 text-sm', falla && 'font-semibold text-red-800')}>{i.nombre}</span>
                  <span className="w-20 text-center text-xs text-muted-foreground">
                    {i.debeHaber != null ? `${i.debeHaber}${i.unidad ? ` ${i.unidad}` : ''}` : '—'}
                  </span>
                  <Contador valor={r?.existente ?? null} onChange={(v) => onCambio(i.id, { existente: v })} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className={cx('min-w-40 flex-1 text-sm', falla && 'font-semibold text-red-800')}>
                    {i.nombre}
                    {i.invertido && <span className="ml-1 text-xs font-normal text-muted-foreground">(SI = falla)</span>}
                  </span>
                  <Segmentos
                    opciones={s.tipoRespuesta === 'SI_NO_HABILITACION' ? OPCIONES_RESPUESTA.slice(0, 2) : OPCIONES_RESPUESTA}
                    valor={r?.respuesta}
                    onChange={(v) => onCambio(i.id, { respuesta: v, ...(v === 'NA' ? { estado: null, nivel: null } : {}) })}
                    colores={
                      i.invertido ? { ...COLOR_RESPUESTA, SI: COLOR_RESPUESTA.NO, NO: COLOR_RESPUESTA.SI } : COLOR_RESPUESTA
                    }
                  />
                  {r?.respuesta !== 'NA' &&
                    (s.tipoRespuesta === 'SI_NO_NIVEL' ? (
                      <Segmentos
                        opciones={OPCIONES_NIVEL}
                        valor={r?.nivel}
                        onChange={(v) => onCambio(i.id, { nivel: v as Nivel | null })}
                        colores={COLOR_NIVEL}
                      />
                    ) : (
                      <Segmentos
                        opciones={estados.map((e) => ({ valor: e.valor, nombre: e.valor }))}
                        valor={r?.estado}
                        onChange={(v) => onCambio(i.id, { estado: v as Estado | null })}
                        colores={COLOR_ESTADO}
                      />
                    ))}
                </div>
              )}
              {falla && (
                <Entrada
                  className="mt-2 min-h-9 text-sm"
                  placeholder="Detalle de la falla (opcional)"
                  value={r?.nota ?? ''}
                  maxLength={200}
                  onChange={(e) => onCambio(i.id, { nota: e.target.value })}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Contador({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex w-32 items-center justify-center gap-1">
      <button
        type="button"
        className="grid size-9 place-items-center rounded-md bg-muted ring-1 ring-border active:bg-border"
        onClick={() => onChange(Math.max(0, (valor ?? 1) - 1))}
      >
        <Minus className="size-4" />
      </button>
      <input
        inputMode="numeric"
        className="h-9 w-12 rounded-md text-center text-base font-semibold ring-1 ring-input focus:ring-2 focus:ring-ring focus:outline-none"
        value={valor ?? ''}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, '')
          onChange(t === '' ? null : Math.min(100000, Number(t)))
        }}
      />
      <button
        type="button"
        className="grid size-9 place-items-center rounded-md bg-muted ring-1 ring-border active:bg-border"
        onClick={() => onChange((valor ?? 0) + 1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
