import { useEffect, useRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { estados, prioridades } from '../lib/formato'
import { useSesion } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import { Icono } from './Icono'
export function ErrorAviso({ texto }: { texto: string }) {
  return texto ? (
    <p className="err note" role="alert">
      <Icono nombre="alert" size={16} />
      {texto}
    </p>
  ) : null
}
export function Campo({
  label,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        className="inp"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p className="err" id={`${id}-error`}>
          <Icono nombre="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  )
}
export function Estado({ valor }: { valor: string }) {
  return (
    <span className={`pill st-${valor === 'pendiente' ? 'p' : valor === 'en_proceso' ? 'e' : 'r'}`}>
      <Icono
        nombre={valor === 'pendiente' ? 'clock' : valor === 'en_proceso' ? 'tool' : 'check'}
        size={15}
      />
      {estados[valor]}
    </span>
  )
}
export function Prioridad({ valor }: { valor: string | null }) {
  return (
    <span className={`pri pr-${valor?.[0] ?? 's'}`}>
      <i />
      {prioridades[valor ?? 'sin']}
    </span>
  )
}
export function Logo() {
  return (
    <div className="sbrand">
      <img src={`${import.meta.env.BASE_URL}icono.svg`} width="36" height="36" alt="" />
      <b>AguaAlerta</b>
    </div>
  )
}
export function Dialogo({
  titulo,
  children,
  confirmar,
  cancelar,
  textoConfirmar = 'Confirmar',
}: {
  textoConfirmar?: string
  titulo: string
  children: ReactNode
  confirmar: () => void
  cancelar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog className="dlg" ref={ref} onCancel={cancelar} aria-labelledby="dialogo-titulo">
      <h2 id="dialogo-titulo">{titulo}</h2>
      {children}
      <div className="dbtn">
        <button className="btn btn-sec" onClick={cancelar}>
          Cancelar
        </button>
        <button className="btn btn-pri" onClick={confirmar}>
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}
export function Marco({ panel = false }: { panel?: boolean }) {
  const { perfil } = useSesion()
  return (
    <div className={`screen ${panel ? 'desk' : 'phone'}`}>
      {panel && (
        <aside className="side">
          <Logo />
          <nav>
            <NavLink end to="/panel" className={({ isActive }) => `ni ${isActive ? 'on' : ''}`}>
              <Icono nombre="list" />
              Reportes
            </NavLink>
            <NavLink to="/panel/registrar" className="ni">
              <Icono nombre="phone" />
              Registrar reporte
            </NavLink>
            {perfil?.rol === 'administrador' && (
              <NavLink to="/panel/personal" className="ni">
                <Icono nombre="users" />
                Personal
              </NavLink>
            )}
          </nav>
          <div className="who">
            <b>{perfil?.nombre}</b>
            <span>ASADA Comunal de Lorena</span>
            <button className="btn btn-sec sm" onClick={() => void supabase.auth.signOut()}>
              Cerrar sesión
            </button>
          </div>
        </aside>
      )}
      <main className={panel ? '' : 'pb'}>
        <Outlet />
      </main>
      {!panel && (
        <nav className="tabs">
          {perfil?.rol === 'fontanero' ? (
            <>
              <NavLink className="tab" to="/asignados">
                <Icono nombre="list" size={22} />
                Mis asignados
              </NavLink>
              <button className="tab" onClick={() => void supabase.auth.signOut()}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <NavLink className="tab" to="/reportes">
                <Icono nombre="list" size={22} />
                Mis reportes
              </NavLink>
              <NavLink className="tab" to="/reportes/nuevo">
                <Icono nombre="plus" size={22} />
                Reportar
              </NavLink>
              <NavLink className="tab" to="/cuenta">
                <Icono nombre="user" size={22} />
                Cuenta
              </NavLink>
            </>
          )}
        </nav>
      )}
    </div>
  )
}
