import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { tipos, medios } from '../lib/formato'
import { ubicacionValida, validarFoto } from '../lib/validaciones'
import { Campo, ErrorAviso } from './UI'
import { MapaSelector } from './Mapa'
import { enfocarError } from '../lib/formato'
import type { Punto } from './Mapa'
interface Foto {
  archivo: File
  ext: string
  vista: string
  ruta?: string
}
export function FormularioReporte({ asistido = false }: { asistido?: boolean }) {
  const { session } = useSesion()
  const navegar = useNavigate()
  const [solicitud] = useState(() => crypto.randomUUID())
  const enviando = useRef(false)
  const [tipo, setTipo] = useState(''),
    [descripcion, setDescripcion] = useState(''),
    [senas, setSenas] = useState('')
  const [nombre, setNombre] = useState(''),
    [telefono, setTelefono] = useState(''),
    [medio, setMedio] = useState('telefono')
  const [punto, setPunto] = useState<Punto | null>(null),
    [fotos, setFotos] = useState<Foto[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [errorFoto, setErrorFoto] = useState('')
  const [ocupado, setOcupado] = useState(false),
    [validando, setValidando] = useState(false)
  const vistas = useRef(new Set<string>())
  useEffect(
    () => () => {
      vistas.current.forEach(URL.revokeObjectURL)
    },
    []
  )
  async function adjuntar(archivos: FileList | null) {
    if (!archivos) return
    setValidando(true)
    setErrorFoto('')
    const nuevas: Foto[] = []
    try {
      for (const archivo of Array.from(archivos)) {
        if (fotos.length + nuevas.length >= 3) {
          setErrorFoto('Puede adjuntar hasta 3 fotografías')
          break
        }
        const ext = await validarFoto(archivo),
          vista = URL.createObjectURL(archivo)
        vistas.current.add(vista)
        nuevas.push({ archivo, ext, vista })
      }
    } catch (fallo) {
      setErrorFoto(fallo instanceof Error ? fallo.message : 'No se pudo cargar la fotografía')
    } finally {
      setFotos((previas) => [...previas, ...nuevas])
      setValidando(false)
    }
  }
  async function enviar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enviando.current || validando) return
    const fallos: Record<string, string> = {}
    if (!tipo) fallos.tipo = 'Seleccione el tipo de incidente'
    if (descripcion.trim().length < 3) fallos.descripcion = 'Escriba la descripción del incidente'
    if (!ubicacionValida(punto, senas))
      fallos.ubicacion = 'Indique la ubicación en el mapa o con señas'
    if (asistido && nombre.trim().length < 2) fallos.nombre = 'Escriba el nombre del vecino'
    if (asistido && telefono.trim().length < 8) fallos.telefono = 'Falta el teléfono de contacto'
    setErrores(fallos)
    if (Object.keys(fallos).length) {
      enfocarError()
      return
    }
    enviando.current = true
    setOcupado(true)
    setError('')
    try {
      if (!session) throw new Error('sesion')
      for (const foto of fotos) {
        if (foto.ruta) continue
        const ruta = `${session.user.id}/${solicitud}/${crypto.randomUUID()}.${foto.ext}`
        const { error: fallo } = await supabase.storage.from('fotos').upload(ruta, foto.archivo, {
          contentType: foto.ext === 'jpg' ? 'image/jpeg' : 'image/png',
        })
        if (fallo) throw fallo
        foto.ruta = ruta
      }
      const parametros = {
        p_solicitud: solicitud,
        p_tipo: tipo,
        p_descripcion: descripcion,
        p_lat: punto?.[0] ?? null,
        p_lng: punto?.[1] ?? null,
        p_senas: senas,
      }
      const { data, error: fallo } = asistido
        ? await supabase.rpc('registrar_reporte_asistido', {
            ...parametros,
            p_medio: medio,
            p_nombre: nombre,
            p_telefono: telefono,
          })
        : await supabase.rpc('crear_reporte', { ...parametros, p_fotos: fotos.map((f) => f.ruta) })
      if (fallo || !data?.[0]) throw fallo || new Error('sin-confirmacion')
      navegar(asistido ? `/panel/reportes/${data[0].id}` : `/reportes/${data[0].id}/confirmacion`, {
        state: { numero: data[0].numero },
      })
    } catch {
      setError('No se pudo confirmar el envío. Inténtelo de nuevo')
    } finally {
      enviando.current = false
      setOcupado(false)
    }
  }
  return (
    <>
      <header className="hd bar">
        <h1>{asistido ? 'Registrar reporte de un vecino' : 'Nuevo reporte'}</h1>
      </header>
      <form className="c col" onSubmit={enviar} noValidate>
        <fieldset disabled={ocupado} className="col">
          {asistido && (
            <>
              <div className="field">
                <label htmlFor="medio">Medio de recepción</label>
                <select
                  id="medio"
                  className="inp"
                  value={medio}
                  onChange={(e) => setMedio(e.target.value)}
                >
                  {Object.entries(medios)
                    .filter(([v]) => v !== 'app')
                    .map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>
              <Campo
                id="vecino"
                label="Nombre del vecino"
                maxLength={120}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={errores.nombre}
              />
              <Campo
                id="contacto"
                label="Teléfono de contacto"
                type="tel"
                maxLength={30}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                error={errores.telefono}
              />
            </>
          )}
          <div className="field">
            <label htmlFor="tipo">¿Qué pasa?</label>
            <select
              id="tipo"
              className="inp"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              aria-invalid={Boolean(errores.tipo)}
              aria-describedby={errores.tipo ? 'tipo-error' : undefined}
            >
              <option value="">Seleccione el tipo de incidente</option>
              {Object.entries(tipos).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
            {errores.tipo && (
              <p className="err" id="tipo-error">
                {errores.tipo}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              className="inp area"
              rows={4}
              maxLength={1000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={Boolean(errores.descripcion)}
              aria-describedby={errores.descripcion ? 'descripcion-error' : undefined}
            />
            {errores.descripcion && (
              <p className="err" id="descripcion-error">
                {errores.descripcion}
              </p>
            )}
          </div>
          {!asistido && (
            <div className="field">
              <label htmlFor="fotos">
                Fotografías <span className="opt">hasta 3 · opcional</span>
              </label>
              <input
                id="fotos"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                disabled={validando}
                aria-invalid={Boolean(errorFoto)}
                aria-describedby={errorFoto ? 'fotos-error' : undefined}
                onChange={(e) => {
                  void adjuntar(e.target.files)
                  e.target.value = ''
                }}
              />
              {validando && <p role="status">Revisando fotografías…</p>}
              <div className="fotos">
                {fotos.map((f, i) => (
                  <div key={f.vista}>
                    <img
                      className="foto"
                      src={f.vista}
                      alt={`Fotografía ${i + 1}`}
                      width="86"
                      height="86"
                    />
                    <button
                      type="button"
                      className="btn btn-sec sm"
                      onClick={() => {
                        URL.revokeObjectURL(f.vista)
                        vistas.current.delete(f.vista)
                        setFotos(fotos.filter((x) => x !== f))
                      }}
                    >
                      Quitar {i + 1}
                    </button>
                  </div>
                ))}
              </div>
              {errorFoto && (
                <p className="err" id="fotos-error">
                  {errorFoto}
                </p>
              )}
            </div>
          )}
          <h2 className="lab">¿Dónde es?</h2>
          <MapaSelector punto={punto} cambiar={setPunto} />
          <Campo
            id="senas"
            label="Señas del lugar"
            maxLength={300}
            value={senas}
            onChange={(e) => setSenas(e.target.value)}
            error={errores.ubicacion}
          />
          <ErrorAviso texto={error} />
          <button className="btn btn-pri" disabled={ocupado || validando}>
            {ocupado ? 'Enviando…' : asistido ? 'Guardar reporte' : 'Enviar reporte'}
          </button>
        </fieldset>
      </form>
    </>
  )
}
