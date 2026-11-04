import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Perfil } from '../../lib/supabase'
import { useSesion } from '../../lib/sesion'
import { errorFuncion } from '../../lib/errores'
import { correoValido } from '../../lib/validaciones'
import { enfocarError } from '../../lib/formato'
import { Campo, Dialogo, ErrorAviso } from '../../componentes/UI'
const roles = { oficinista: 'Oficinista', fontanero: 'Fontanero', administrador: 'Administrador' }
export function Personal() {
  const { perfil } = useSesion()
  const [personas, setPersonas] = useState<(Perfil & { correo: string })[]>([]),
    [error, setError] = useState(''),
    [mensaje, setMensaje] = useState(''),
    [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [revision, setRevision] = useState(0)
  const [editar, setEditar] = useState<{
    id?: string
    nombre: string
    correo: string
    rol: string
  } | null>(null)
  const [confirmacion, setConfirmacion] = useState<{
    accion: string
    id?: string
    nombre?: string
    rol?: string
  } | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  useEffect(() => {
    let vigente = true
    setCargando(true)
    void (async () => {
      try {
        const { data, error: fallo } = await supabase.functions.invoke('personal', {
          body: { accion: 'listar' },
        })
        if (fallo) throw fallo
        if (vigente) setPersonas(data.personas as (Perfil & { correo: string })[])
      } catch {
        if (vigente) setError('No se pudo cargar el personal')
      } finally {
        if (vigente) setCargando(false)
      }
    })()
    return () => {
      vigente = false
    }
  }, [revision])
  async function ejecutar(body: Record<string, unknown>) {
    setOcupado(true)
    setError('')
    setMensaje('')
    setConfirmacion(null)
    try {
      const { data, error: fallo } = await supabase.functions.invoke('personal', {
        body,
      })
      if (fallo) {
        setError(await errorFuncion(fallo))
        return
      }
      setEditar(null)
      setMensaje(
        data?.enlace_enviado === false
          ? 'Cuenta creada. No se pudo enviar el enlace para definir la contraseña.'
          : 'Cambios guardados'
      )
      setRevision((v) => v + 1)
    } catch {
      setError('No se pudo confirmar el cambio')
      setRevision((v) => v + 1)
    } finally {
      setOcupado(false)
    }
  }
  function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editar) return
    const fallos: Record<string, string> = {}
    if (editar.nombre.trim().length < 2) fallos.nombre = 'Escriba el nombre'
    if (!editar.id && !correoValido(editar.correo)) fallos.correo = 'Formato de correo inválido'
    setErrores(fallos)
    if (Object.keys(fallos).length) {
      enfocarError()
      return
    }
    if (editar.id)
      setConfirmacion({
        accion: 'actualizar',
        id: editar.id,
        nombre: editar.nombre,
        rol: editar.rol,
      })
    else void ejecutar({ accion: 'crear', ...editar })
  }
  return (
    <>
      <header className="hd">
        <h1>Personal</h1>
        <button
          className="btn btn-pri"
          disabled={ocupado}
          onClick={() => {
            setErrores({})
            setEditar({ nombre: '', correo: '', rol: 'oficinista' })
          }}
        >
          Agregar persona
        </button>
      </header>
      <ErrorAviso texto={error} />
      {mensaje && (
        <p className="note ok" role="status">
          {mensaje}
        </p>
      )}
      {cargando ? (
        <p role="status">Cargando personal…</p>
      ) : (
        <>
          <button
            className="btn btn-sec sm"
            onClick={() => {
              setError('')
              setRevision((v) => v + 1)
            }}
          >
            Actualizar lista
          </button>
          {!personas.length && <p>No hay personal registrado</p>}
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => (
                <tr key={p.id}>
                  <td data-label="Nombre">{p.nombre}</td>
                  <td data-label="Correo">{p.correo}</td>
                  <td data-label="Perfil">{roles[p.rol as keyof typeof roles]}</td>
                  <td data-label="Estado">{p.activo ? 'Activa' : 'Inactiva'}</td>
                  <td data-label="Acciones">
                    <button
                      className="btn btn-sec sm"
                      aria-label={`Editar a ${p.nombre}`}
                      disabled={ocupado}
                      onClick={() => {
                        setErrores({})
                        setEditar({ id: p.id, nombre: p.nombre, correo: '', rol: p.rol })
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sec sm"
                      aria-label={`${p.activo ? 'Desactivar' : 'Activar'} a ${p.nombre}`}
                      disabled={ocupado || p.id === perfil?.id}
                      title={
                        p.id === perfil?.id ? 'No puede desactivar su propia cuenta' : undefined
                      }
                      onClick={() =>
                        setConfirmacion({ accion: p.activo ? 'desactivar' : 'activar', id: p.id })
                      }
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {editar && (
        <form className="panel" onSubmit={guardar} noValidate>
          <h2>{editar.id ? 'Editar persona' : 'Agregar persona'}</h2>
          <Campo
            id="personal-nombre"
            label="Nombre"
            maxLength={120}
            value={editar.nombre}
            onChange={(e) => setEditar({ ...editar, nombre: e.target.value })}
            error={errores.nombre}
          />
          {!editar.id && (
            <Campo
              id="personal-correo"
              label="Correo"
              type="email"
              value={editar.correo}
              onChange={(e) => setEditar({ ...editar, correo: e.target.value })}
              error={errores.correo}
            />
          )}
          <label htmlFor="rol">Perfil</label>
          <select
            className="inp"
            id="rol"
            value={editar.rol}
            onChange={(e) => setEditar({ ...editar, rol: e.target.value })}
          >
            {Object.entries(roles).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <button className="btn btn-pri" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="btn btn-sec" type="button" onClick={() => setEditar(null)}>
            Cancelar
          </button>
        </form>
      )}
      {confirmacion && (
        <Dialogo
          titulo="¿Confirmar el cambio?"
          cancelar={() => setConfirmacion(null)}
          confirmar={() => void ejecutar(confirmacion)}
        >
          <p>
            {confirmacion.accion === 'desactivar'
              ? 'Esta persona dejará de tener acceso a AguaAlerta.'
              : 'Se actualizará la cuenta del personal.'}
          </p>
        </Dialogo>
      )}
    </>
  )
}
