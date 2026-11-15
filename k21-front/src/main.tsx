import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Layout, SoloAdmin } from './components/Layout'
import './index.css'
import { ErrorDatos } from './lib/datos'
import { CambiarContrasenha } from './pages/CambiarContrasenha'
import { ControlDetallePagina } from './pages/ControlDetalle'
import { ControlFormulario } from './pages/ControlFormulario'
import { Controles } from './pages/Controles'
import { Inicio } from './pages/Inicio'
import { Ingresar } from './pages/Ingresar'
import { Moviles } from './pages/Moviles'
import { Planillas } from './pages/Planillas'
import { Usuarios } from './pages/Usuarios'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Errores de negocio (permiso, validación, no encontrado): no tiene sentido reintentar.
      retry: (n, e) => (!(e instanceof ErrorDatos) || e.codigo === 'SIN_CONEXION') && n < 2,
      refetchOnWindowFocus: true,
    },
  },
})

const router = createBrowserRouter([
  { path: '/ingresar', element: <Ingresar /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/inicio" replace /> },
      { path: 'inicio', element: <Inicio /> },
      { path: 'controles', element: <Controles /> },
      { path: 'controles/nuevo/:tipo', element: <ControlFormulario /> },
      { path: 'controles/:id', element: <ControlDetallePagina /> },
      { path: 'controles/:id/editar', element: <ControlFormulario /> },
      { path: 'contrasenha', element: <CambiarContrasenha /> },
      {
        element: <SoloAdmin />,
        children: [
          { path: 'usuarios', element: <Usuarios /> },
          { path: 'moviles', element: <Moviles /> },
          { path: 'planillas', element: <Planillas /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/inicio" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
