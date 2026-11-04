import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configurado, supabase } from './supabase'
import type { Perfil } from './supabase'
const Contexto = createContext<{
  session: Session | null
  perfil: Perfil | null
  cargando: boolean
  error: string
  recargar: () => void
}>({ session: null, perfil: null, cargando: true, error: '', recargar: () => {} })
export const inicio = (rol?: string) =>
  rol === 'ciudadano' ? '/reportes' : rol === 'fontanero' ? '/asignados' : '/panel'
export const useSesion = () => useContext(Contexto)
export function Sesion({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const usuarioActual = useRef<string | null>(null)
  useEffect(() => {
    let vigente = true
    let turno = 0
    // Renovar el token o volver a la pestana no debe desmontar la pantalla ni perder un formulario.
    async function actualizar(s: Session | null, forzar = false) {
      const usuario = s?.user.id ?? null
      setSession(s)
      if (!forzar && usuario === usuarioActual.current) return
      usuarioActual.current = usuario
      const actual = ++turno
      setPerfil(null)
      setCargando(true)
      setError('')
      try {
        if (s) {
          const { data, error: fallo } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', s.user.id)
            .single()
          if (fallo) throw fallo
          if (vigente && actual === turno) {
            if (data.activo) setPerfil(data as Perfil)
            else {
              await supabase.auth.signOut()
              setError('Correo o contraseña incorrectos')
            }
          }
        }
      } catch {
        if (vigente && actual === turno) setError('No se pudo cargar su perfil')
      } finally {
        if (vigente && actual === turno) setCargando(false)
      }
    }
    if (!configurado) {
      setError('Falta configurar la conexión con Supabase')
      setCargando(false)
      return
    }
    void supabase.auth.getSession().then(({ data, error: fallo }) => {
      if (fallo) {
        setError('No se pudo cargar la sesión')
        setCargando(false)
      } else if (vigente) void actualizar(data.session, true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      window.setTimeout(() => {
        if (vigente) void actualizar(s)
      }, 0)
    })
    return () => {
      vigente = false
      data.subscription.unsubscribe()
    }
  }, [revision])
  return (
    <Contexto.Provider
      value={{ session, perfil, cargando, error, recargar: () => setRevision((v) => v + 1) }}
    >
      {children}
    </Contexto.Provider>
  )
}
