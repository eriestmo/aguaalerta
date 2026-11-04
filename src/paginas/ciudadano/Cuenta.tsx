import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../lib/sesion'
import { supabase } from '../../lib/supabase'
import { Campo, ErrorAviso } from '../../componentes/UI'
export function Cuenta() {
  const { perfil, session } = useSesion()
  const [nombre, setNombre] = useState(perfil?.nombre ?? ''),
    [telefono, setTelefono] = useState(perfil?.telefono ?? ''),
    [error, setError] = useState(''),
    [guardado, setGuardado] = useState(false),
    [ocupado, setOcupado] = useState(false)
  async function guardar() {
    setError('')
    setGuardado(false)
    if (nombre.trim().length < 2) {
      setError('Escriba su nombre')
      return
    }
    setOcupado(true)
    const { error: fallo } = await supabase
      .from('profiles')
      .update({ nombre: nombre.trim(), telefono: telefono.trim() || null })
      .eq('id', session!.user.id)
    setOcupado(false)
    if (fallo) setError('No se pudieron guardar los cambios')
    else setGuardado(true)
  }
  return (
    <>
      <header className="bar">
        <h1>Mi cuenta</h1>
      </header>
      <div className="c">
        <Campo
          id="nombre"
          label="Nombre"
          value={nombre}
          maxLength={120}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Campo
          id="telefono"
          label="Teléfono"
          type="tel"
          value={telefono}
          maxLength={30}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <p>{session?.user.email}</p>
        <ErrorAviso texto={error} />
        {guardado && <p className="note ok">Cambios guardados</p>}
        <button className="btn btn-pri" disabled={ocupado} onClick={() => void guardar()}>
          Guardar cambios
        </button>
        <button
          className="btn btn-sec"
          onClick={() => {
            void supabase.auth.signOut().then(({ error: fallo }) => {
              if (fallo) setError('No se pudo cerrar la sesión')
            })
          }}
        >
          Cerrar sesión
        </button>
        <Link className="lk" to="/privacidad">
          Aviso de privacidad
        </Link>
      </div>
    </>
  )
}
