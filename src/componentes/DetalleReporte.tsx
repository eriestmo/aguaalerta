import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Evento, Perfil, Reporte } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { estados, fecha, medios, prioridades, tipos } from '../lib/formato'
import { Dialogo, ErrorAviso, Estado, Prioridad } from './UI'
import { MapaVista } from './Mapa'
export function DetalleReporte() {
  const { id } = useParams(),
    { perfil } = useSesion()
  const ciudadano = perfil?.rol === 'ciudadano',
    oficina = perfil?.rol === 'oficinista' || perfil?.rol === 'administrador'
  const [reporte, setReporte] = useState<Reporte | null>(null),
    [eventos, setEventos] = useState<Evento[]>([]),
    [personal, setPersonal] = useState<Perfil[]>([])
  const [fotos, setFotos] = useState<string[]>([]),
    [error, setError] = useState(''),
    [errorCambio, setErrorCambio] = useState(''),
    [errorFotos, setErrorFotos] = useState('')
  const [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [revision, setRevision] = useState(0)
  const [estado, setEstado] = useState(''),
    [prioridad, setPrioridad] = useState(''),
    [responsable, setResponsable] = useState(''),
    [nota, setNota] = useState(''),
    [confirmar, setConfirmar] = useState(false),
    [errorNota, setErrorNota] = useState('')
  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    setErrorFotos('')
    void (async () => {
      try {
        const { data: r, error: fallo } = await supabase
          .from('reportes')
          .select('*')
          .eq('id', id!)
          .maybeSingle()
        if (fallo) throw fallo
        if (!r) {
          if (vigente) {
            setReporte(null)
            setError('No tiene acceso a este reporte')
          }
          return
        }
        let consulta = supabase
          .from('eventos')
          .select('*')
          .eq('reporte_id', id!)
          .order('creado_en', { ascending: false })
        if (ciudadano)
          consulta = consulta.eq('visible_ciudadano', true).in('tipo', ['creacion', 'estado'])
        const [historial, imagenes, personas] = await Promise.all([
          consulta,
          supabase.from('reporte_fotos').select('ruta').eq('reporte_id', id!),
          ciudadano
            ? Promise.resolve({ data: [] as Perfil[], error: null })
            : supabase
                .from('profiles')
                .select('id, nombre, telefono, rol, activo')
                .neq('rol', 'ciudadano'),
        ])
        if (historial.error) throw historial.error
        if (personas.error) throw personas.error
        const enlaces: string[] = []
        let falloFotos = Boolean(imagenes.error)
        for (const foto of imagenes.data ?? []) {
          const { data, error: falloFoto } = await supabase.storage
            .from('fotos')
            .createSignedUrl(foto.ruta, 300)
          if (falloFoto || !data) falloFotos = true
          else enlaces.push(data.signedUrl)
        }
        if (!vigente) return
        setReporte(r as Reporte)
        setEstado(r.estado)
        setPrioridad(r.prioridad ?? '')
        setResponsable(r.responsable_id ?? '')
        setEventos(historial.data as Evento[])
        setPersonal(personas.data as Perfil[])
        setFotos(enlaces)
        if (falloFotos) setErrorFotos('No se pudieron cargar las fotografías')
        if (ciudadano) {
          const { error: vistoError } = await supabase.rpc('marcar_visto', { p_id: id })
          if (vistoError && vigente) setErrorCambio('No se pudo marcar el reporte como visto')
        }
      } catch {
        if (vigente) setError('No se pudo cargar el reporte')
      } finally {
        if (vigente) setCargando(false)
      }
    })()
    return () => {
      vigente = false
    }
  }, [id, ciudadano, revision])
  async function cambiar(operacion: string, parametros: Record<string, unknown>) {
    if (!reporte || ocupado) return
    setOcupado(true)
    setErrorCambio('')
    try {
      const { error: fallo } = await supabase.rpc(operacion, {
        p_id: reporte.id,
        ...(operacion === 'agregar_nota' ? {} : { p_version: reporte.version }),
        ...parametros,
      })
      if (fallo) {
        setErrorCambio(
          fallo.message.includes('conflicto')
            ? 'Otra persona cambió este reporte'
            : 'No se pudo confirmar el cambio'
        )
      } else {
        if (operacion === 'agregar_nota') setNota('')
        if (operacion === 'cambiar_estado')
          void supabase.functions
            .invoke('notificar-estado', { body: { reporte_id: reporte.id } })
            .catch(() => {})
      }
    } catch {
      setErrorCambio('No se pudo confirmar el cambio')
    } finally {
      setOcupado(false)
      setRevision((v) => v + 1)
    }
  }
  if (cargando) return <p role="status">Cargando reporte…</p>
  if (error || !reporte)
    return (
      <>
        <ErrorAviso texto={error || 'No tiene acceso a este reporte'} />
        <button className="btn btn-sec" onClick={() => setRevision((v) => v + 1)}>
          Reintentar
        </button>
      </>
    )
  const fontaneros = personal.filter((p) => p.rol === 'fontanero' && p.activo)
  return (
    <>
      <header className="hd bar">
        <div>
          <Link className="lk" to={ciudadano ? '/reportes' : oficina ? '/panel' : '/asignados'}>
            Reportes
          </Link>
          <h1 className="mono">{reporte.numero}</h1>
        </div>
        <div className="stat">
          <span>Estado actual</span>
          <Estado valor={reporte.estado} />
        </div>
      </header>
      <ErrorAviso texto={errorCambio} />
      <div className={oficina ? 'two' : 'c col'}>
        <div className="col">
          <section className="panel">
            <h2>{tipos[reporte.tipo]}</h2>
            <p className="texto">{reporte.descripcion}</p>
            <p className="hint">{fecha(reporte.creado_en)}</p>
            <Prioridad valor={reporte.prioridad} />
            <div className="fotos">
              {fotos.map((f, i) => (
                <a href={f} key={f} target="_blank" rel="noopener noreferrer">
                  <img
                    className="foto"
                    src={f}
                    alt={`Fotografía del incidente ${i + 1}`}
                    width="120"
                    height="120"
                  />
                </a>
              ))}
            </div>
            <ErrorAviso texto={errorFotos} />
            {!fotos.length && !errorFotos && <p>Sin fotografías adjuntas</p>}
          </section>
          <section className="panel">
            <h3 className="lab">Ubicación</h3>
            {reporte.lat !== null && reporte.lng !== null && (
              <MapaVista punto={[reporte.lat, reporte.lng]} />
            )}
            <p>{reporte.senas}</p>
          </section>
          {!ciudadano && (
            <section className="panel">
              <h3 className="lab">Contacto y origen</h3>
              <dl>
                <dt>Nombre</dt>
                <dd>{reporte.contacto_nombre}</dd>
                <dt>Teléfono</dt>
                <dd>
                  {reporte.contacto_telefono ? (
                    <a href={`tel:${reporte.contacto_telefono}`}>{reporte.contacto_telefono}</a>
                  ) : (
                    'Sin teléfono'
                  )}
                </dd>
                <dt>Medio</dt>
                <dd>{medios[reporte.medio]}</dd>
                <dt>Registrado por</dt>
                <dd>
                  {personal.find((p) => p.id === reporte.registrado_por)?.nombre ??
                    (reporte.medio === 'app' ? 'El ciudadano' : 'Personal de la ASADA')}
                </dd>
                <dt>Responsable</dt>
                <dd>
                  {personal.find((p) => p.id === reporte.responsable_id)?.nombre ??
                    (perfil?.id === reporte.responsable_id ? perfil.nombre : 'Sin asignar')}
                </dd>
              </dl>
            </section>
          )}
        </div>
        <div className="col">
          {!ciudadano && (
            <fieldset className="col" disabled={ocupado}>
              {oficina && (
                <section className="panel">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    className="inp"
                    id="prioridad"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                  >
                    <option value="">Sin clasificar</option>
                    {Object.entries(prioridades)
                      .filter(([v]) => v !== 'sin')
                      .map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-sec"
                    disabled={!prioridad}
                    onClick={() => void cambiar('cambiar_prioridad', { p_prioridad: prioridad })}
                  >
                    Guardar prioridad
                  </button>
                </section>
              )}
              <section className="panel">
                <label htmlFor="estado">Actualizar estado</label>
                <select
                  id="estado"
                  className="inp"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  {Object.entries(estados).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-pri"
                  disabled={estado === reporte.estado}
                  onClick={() =>
                    estado === 'resuelto'
                      ? setConfirmar(true)
                      : void cambiar('cambiar_estado', { p_estado: estado })
                  }
                >
                  Guardar estado
                </button>
              </section>
              {oficina && (
                <section className="panel">
                  <label htmlFor="responsable">Responsable</label>
                  {fontaneros.length ? (
                    <>
                      <select
                        className="inp"
                        id="responsable"
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                      >
                        <option value="">Seleccione el fontanero</option>
                        {fontaneros.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-sec"
                        disabled={!responsable}
                        onClick={() =>
                          void cambiar('asignar_responsable', { p_responsable: responsable })
                        }
                      >
                        Guardar responsable
                      </button>
                    </>
                  ) : (
                    <p>No hay personal disponible para asignar</p>
                  )}
                </section>
              )}
              <section className="panel">
                <label htmlFor="nota">
                  {oficina ? 'Nota interna' : 'Nota de la atención'}{' '}
                  <span className="opt">no la ve el ciudadano</span>
                </label>
                <textarea
                  className="inp area"
                  id="nota"
                  value={nota}
                  maxLength={1000}
                  onChange={(e) => setNota(e.target.value)}
                  aria-invalid={Boolean(errorNota)}
                  aria-describedby={errorNota ? 'nota-error' : undefined}
                />
                {errorNota && (
                  <p className="err" id="nota-error">
                    {errorNota}
                  </p>
                )}
                <button
                  className="btn btn-sec"
                  onClick={() => {
                    if (!nota.trim()) setErrorNota('Escriba el contenido de la nota')
                    else {
                      setErrorNota('')
                      void cambiar('agregar_nota', { p_texto: nota })
                    }
                  }}
                >
                  Guardar nota
                </button>
              </section>
            </fieldset>
          )}
          <section className="panel">
            <h3 className="lab">Historial</h3>
            <ol className="tl">
              {eventos.map((evento, i) => (
                <li className={i === 0 ? 'on' : ''} key={evento.id}>
                  <b>
                    {evento.tipo === 'creacion'
                      ? 'Reporte recibido'
                      : evento.tipo === 'estado'
                        ? estados[evento.valor]
                        : evento.tipo === 'prioridad'
                          ? `Prioridad ${prioridades[evento.valor]}`
                          : evento.tipo === 'asignacion'
                            ? `Asignado a ${evento.valor}`
                            : evento.valor}
                  </b>
                  <span>
                    {fecha(evento.creado_en)}
                    {!ciudadano &&
                      ` · ${personal.find((p) => p.id === evento.autor_id)?.nombre ?? (evento.autor_id === reporte.ciudadano_id ? reporte.contacto_nombre : evento.autor_id === perfil?.id ? perfil.nombre : 'Personal de la ASADA')}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
      {confirmar && (
        <Dialogo
          textoConfirmar="Sí, marcar resuelto"
          titulo="¿Marcar como resuelto?"
          cancelar={() => setConfirmar(false)}
          confirmar={() => {
            setConfirmar(false)
            void cambiar('cambiar_estado', { p_estado: 'resuelto' })
          }}
        >
          <p>El ciudadano verá el reporte {reporte.numero} como resuelto y recibirá un aviso.</p>
        </Dialogo>
      )}
    </>
  )
}
