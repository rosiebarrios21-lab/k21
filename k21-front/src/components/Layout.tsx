import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Home, KeyRound, ListChecks, Loader2, LogOut, Truck, Users } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import logoK21 from '../assets/logo-k21.webp'
import { useSesion } from '../lib/sesion'
import { NOMBRE_ROL } from '../lib/tipos'
import { cx } from './ui'

export function Layout() {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  const salir = useSesion((s) => s.salir)
  const qc = useQueryClient()
  const { pathname } = useLocation()
  if (cargando) return <Cargando />
  if (!usuario) return <Navigate to="/ingresar" state={{ desde: pathname }} replace />

  const enlaces = [
    { a: '/inicio', nombre: 'Inicio', icono: Home },
    { a: '/controles', nombre: usuario.rol === 'ADMIN' ? 'Controles' : 'Mis controles', icono: ClipboardList },
    ...(usuario.rol === 'ADMIN'
      ? [
          { a: '/usuarios', nombre: 'Usuarios', icono: Users },
          { a: '/moviles', nombre: 'Móviles', icono: Truck },
          { a: '/planillas', nombre: 'Planillas', icono: ListChecks },
        ]
      : []),
  ]

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white p-0.5 shadow-sm">
            <img src={logoK21} alt="K21" className="size-full object-contain" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">21ª Compañía "Areguá"</p>
            <p className="truncate text-xs opacity-75">
              {usuario.nombre} · {NOMBRE_ROL[usuario.rol]}
            </p>
          </div>
          <nav className="hidden gap-1 md:flex">
            {enlaces.map((e) => (
              <NavLink
                key={e.a}
                to={e.a}
                end={e.a === '/inicio'}
                className={({ isActive }) =>
                  cx('rounded-md px-3 py-1.5 text-sm font-medium', isActive ? 'bg-foreground/15' : 'hover:bg-foreground/10')
                }
              >
                {e.nombre}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/contrasenha" title="Cambiar contraseña" className="rounded-md p-2 hover:bg-foreground/10">
            <KeyRound className="size-5" />
          </NavLink>
          <button
            title="Salir"
            className="rounded-md p-2 hover:bg-foreground/10"
            onClick={async () => {
              await salir()
              qc.clear()
            }}
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <Outlet />
      </main>

      {/* Navegación inferior en el celular */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-white md:hidden">
        {enlaces.map((e) => (
          <NavLink
            key={e.a}
            to={e.a}
            end={e.a === '/inicio'}
            className={({ isActive }) =>
              cx(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-foreground [&_svg]:text-marca-600' : 'text-zinc-500',
              )
            }
          >
            <e.icono className="size-5" />
            {e.nombre}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function SoloAdmin() {
  const rol = useSesion((s) => s.usuario?.rol)
  return rol === 'ADMIN' ? <Outlet /> : <Navigate to="/inicio" replace />
}

function Cargando() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Cargando">
      <Loader2 className="size-8 animate-spin text-marca-600" />
    </div>
  )
}
