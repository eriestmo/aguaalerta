import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Sesion, inicio, useSesion } from './lib/sesion'
import type { Rol } from './lib/supabase'
import { ErrorAviso, Marco } from './componentes/UI'
import { Acceso, Privacidad } from './paginas/Acceso'
import { ListaReportes, Confirmacion } from './paginas/ciudadano/Reportes'
import { Cuenta } from './paginas/ciudadano/Cuenta'
import { Asignados } from './paginas/fontanero/Asignados'
import { Panel } from './paginas/panel/Panel'
import { Personal } from './paginas/panel/Personal'
import { DetalleReporte } from './componentes/DetalleReporte'
import { FormularioReporte } from './componentes/FormularioReporte'
function Protegida({ roles }: { roles: Rol[] }) {
  const { session, perfil, cargando, error, recargar } = useSesion()
  if (cargando) return <p role="status">Cargando sesión…</p>
  if (error)
    return (
      <div className="c">
        <ErrorAviso texto={error} />
        <button className="btn btn-sec" onClick={recargar}>
          Reintentar
        </button>
      </div>
    )
  if (!session || !perfil) return <Navigate to="/ingresar" replace />
  if (!roles.includes(perfil.rol)) return <Navigate to={inicio(perfil.rol)} replace />
  return <Outlet />
}
function Inicio() {
  const { perfil, cargando } = useSesion()
  return cargando ? (
    <p role="status">Cargando sesión…</p>
  ) : (
    <Navigate to={perfil ? inicio(perfil.rol) : '/ingresar'} replace />
  )
}
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Sesion>
        <Routes>
          <Route path="/" element={<Inicio />} />
          {['ingresar', 'crear-cuenta', 'recuperar', 'nueva-contrasena'].map((r) => (
            <Route key={r} path={`/${r}`} element={<Acceso />} />
          ))}
          <Route path="/privacidad" element={<Privacidad />} />
          <Route element={<Protegida roles={['ciudadano']} />}>
            <Route element={<Marco />}>
              <Route path="/reportes" element={<ListaReportes />} />
              <Route path="/reportes/nuevo" element={<FormularioReporte />} />
              <Route path="/reportes/:id" element={<DetalleReporte />} />
              <Route path="/reportes/:id/confirmacion" element={<Confirmacion />} />
              <Route path="/cuenta" element={<Cuenta />} />
            </Route>
          </Route>
          <Route element={<Protegida roles={['oficinista', 'administrador']} />}>
            <Route element={<Marco panel />}>
              <Route path="/panel" element={<Panel />} />
              <Route path="/panel/registrar" element={<FormularioReporte asistido />} />
              <Route path="/panel/reportes/:id" element={<DetalleReporte />} />
              <Route element={<Protegida roles={['administrador']} />}>
                <Route path="/panel/personal" element={<Personal />} />
              </Route>
            </Route>
          </Route>
          <Route element={<Protegida roles={['fontanero']} />}>
            <Route element={<Marco />}>
              <Route path="/asignados" element={<Asignados />} />
              <Route path="/asignados/:id" element={<DetalleReporte />} />
            </Route>
          </Route>
          <Route path="*" element={<Inicio />} />
        </Routes>
      </Sesion>
    </BrowserRouter>
  )
}
