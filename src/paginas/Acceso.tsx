import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { inicio, useSesion } from '../lib/sesion'
import { correoValido, contrasenaValida } from '../lib/validaciones'
import { errorFuncion } from '../lib/errores'
import { Campo, ErrorAviso, Logo } from '../componentes/UI'
import { enfocarError } from '../lib/formato'
import { enlaceApp } from '../lib/formato'
export function Acceso() {
  const { pathname } = useLocation()
  const { session, perfil, cargando, error: errorSesion } = useSesion()
  const navegar = useNavigate()
  const registro = pathname === '/crear-cuenta',
    recuperar = pathname === '/recuperar',
    nueva = pathname === '/nueva-contrasena'
  const [datos, setDatos] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    contrasena: '',
    privacidad: false,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState(''),
    [mensaje, setMensaje] = useState(''),
    [ocupado, setOcupado] = useState(false)
  const [recuperacion, setRecuperacion] = useState(false)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperacion(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    setErrores({})
    setError('')
    setMensaje('')
  }, [pathname])
  if (!nueva && !recuperar && perfil) return <Navigate to={inicio(perfil.rol)} replace />
  async function enviar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMensaje('')
    const fallos: Record<string, string> = {}
    if (!nueva && !correoValido(datos.correo)) fallos.correo = 'Formato de correo inválido'
    if (!recuperar && !datos.contrasena) fallos.contrasena = 'Escriba su contraseña'
    if ((registro || nueva) && !contrasenaValida(datos.contrasena))
      fallos.contrasena = 'Use al menos 8 caracteres'
    if (registro) {
      if (datos.nombre.trim().length < 2) fallos.nombre = 'Escriba su nombre'
      if (!datos.telefono.trim()) fallos.telefono = 'Escriba su teléfono'
      if (!datos.privacidad)
        fallos.privacidad = 'Debe aceptar el aviso de privacidad para continuar'
    }
    setErrores(fallos)
    if (Object.keys(fallos).length) {
      enfocarError()
      return
    }
    setOcupado(true)
    try {
      if (registro) {
        const { error: fallo } = await supabase.auth.signUp({
          email: datos.correo.trim(),
          password: datos.contrasena,
          options: {
            data: {
              nombre: datos.nombre.trim(),
              telefono: datos.telefono.trim(),
              privacidad_aceptada: true,
            },
            emailRedirectTo: enlaceApp('ingresar'),
          },
        })
        if (fallo) throw fallo
        setMensaje('Revise su correo para continuar')
      } else if (recuperar) {
        const { error: fallo } = await supabase.auth.resetPasswordForEmail(datos.correo.trim(), {
          redirectTo: enlaceApp('nueva-contrasena'),
        })
        if (fallo) throw fallo
        setMensaje('Si el correo está registrado, recibirá un enlace')
      } else if (nueva) {
        const { error: fallo } = await supabase.auth.updateUser({ password: datos.contrasena })
        if (fallo) throw fallo
        await supabase.auth.signOut()
        navegar('/ingresar', { replace: true })
      } else {
        const { data, error: fallo } = await supabase.functions.invoke('ingresar', {
          body: { correo: datos.correo.trim(), contrasena: datos.contrasena },
        })
        if (fallo) {
          setError(await errorFuncion(fallo, 'No se pudo iniciar sesión. Inténtelo de nuevo'))
          return
        }
        const { error: sesionError } = await supabase.auth.setSession(data)
        if (sesionError) throw sesionError
      }
    } catch {
      if (registro || recuperar) setError('No se pudo completar la solicitud. Inténtelo de nuevo')
      else setError(nueva ? 'No se pudo cambiar la contraseña' : 'No se pudo iniciar sesión. Inténtelo de nuevo')
    } finally {
      setOcupado(false)
    }
  }
  const titulo = registro
    ? 'Crear cuenta'
    : recuperar
      ? 'Recuperar contraseña'
      : nueva
        ? 'Nueva contraseña'
        : 'Ingresar'
  return (
    <div className="screen phone acceso">
      <div className="hero">
        <Logo />
        <h1 className="brand">{titulo}</h1>
        <p>
          {registro || recuperar || nueva
            ? 'ASADA Comunal de Lorena'
            : 'Avise a su ASADA de una fuga o falla de agua y vea cómo avanza.'}
        </p>
      </div>
      <div className="c">
        {cargando ? (
          <p role="status">Cargando sesión…</p>
        ) : nueva && !session && !recuperacion ? (
          <>
            <ErrorAviso texto="El enlace ya no es válido" />
            <Link className="lk" to="/recuperar">
              Solicitar otro enlace
            </Link>
          </>
        ) : (
          <form className="col" onSubmit={enviar} noValidate>
            {recuperar && (
              <p className="lead">
                Escriba su correo y le enviaremos un enlace para crear una contraseña nueva.
              </p>
            )}
            {registro && (
              <>
                <Campo
                  id="nombre"
                  label="Nombre completo"
                  autoComplete="name"
                  maxLength={120}
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  error={errores.nombre}
                />
                <Campo
                  id="telefono"
                  label="Teléfono"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                  error={errores.telefono}
                />
              </>
            )}
            {!nueva && (
              <Campo
                id="correo"
                label="Correo"
                type="email"
                autoComplete="email"
                value={datos.correo}
                onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
                error={errores.correo}
              />
            )}
            {!recuperar && (
              <Campo
                id="contrasena"
                label="Contraseña"
                type="password"
                autoComplete={registro || nueva ? 'new-password' : 'current-password'}
                value={datos.contrasena}
                onChange={(e) => setDatos({ ...datos, contrasena: e.target.value })}
                error={errores.contrasena}
              />
            )}
            {registro && (
              <div>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={datos.privacidad}
                    onChange={(e) => setDatos({ ...datos, privacidad: e.target.checked })}
                    aria-invalid={Boolean(errores.privacidad)}
                    aria-describedby={errores.privacidad ? 'privacidad-error' : undefined}
                  />
                  <span>
                    Acepto el <Link to="/privacidad">aviso de privacidad</Link>: cómo se usan mis
                    datos, fotos y ubicación.
                  </span>
                </label>
                {errores.privacidad && (
                  <p id="privacidad-error" className="err">
                    {errores.privacidad}
                  </p>
                )}
              </div>
            )}
            <ErrorAviso texto={error || errorSesion} />
            {mensaje && (
              <p className="note ok" role="status">
                {mensaje}
              </p>
            )}
            <button className="btn btn-pri" disabled={ocupado}>
              {ocupado
                ? 'Enviando…'
                : recuperar
                  ? 'Enviar enlace'
                  : nueva
                    ? 'Guardar contraseña'
                    : titulo}
            </button>
          </form>
        )}
        {pathname !== '/ingresar' && (
          <Link className="lk" to="/ingresar">
            Ingresar
          </Link>
        )}
        {!registro && (
          <Link className="lk" to="/crear-cuenta">
            Crear cuenta
          </Link>
        )}
        <Link className="lk" to="/recuperar">
          Olvidé mi contraseña
        </Link>
        <Link className="lk" to="/privacidad">
          Aviso de privacidad
        </Link>
        {!registro && !nueva && !recuperar && (
          <div className="alt">
            <p>
              <b>¿Sin internet o sin celular?</b>
              <br />
              Llame o visite la oficina de la ASADA y registramos su reporte.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
export function Privacidad() {
  return (
    <article className="screen phone acceso">
      <div className="c">
        <Logo />
        <h1>Aviso de privacidad</h1>
        <p>
          AguaAlerta recopila su nombre, correo, teléfono, descripción del incidente, fotografías y
          ubicación para atender sus reportes de agua potable.
        </p>
        <p>
          La ASADA Comunal de Lorena ve estos datos para organizar y dar seguimiento a la atención.
          El fontanero solo puede ver los reportes que tiene asignados.
        </p>
        <p>
          Puede pedir la corrección o eliminación de sus datos contactando a la ASADA Comunal de
          Lorena. Tratamos sus datos conforme a la Ley N.º 8968 de Costa Rica, Protección de la
          Persona frente al Tratamiento de sus Datos Personales.
        </p>
        <p>
          Las fotografías son opcionales. Puede indicar la ubicación con señas si prefiere no
          compartir coordenadas. Los mapas se cargan desde OpenStreetMap, que recibe la zona
          consultada y la dirección de red del dispositivo; no recibe su nombre ni su reporte.
        </p>
        <Link className="lk" to="/">
          Volver al inicio
        </Link>
      </div>
    </article>
  )
}
