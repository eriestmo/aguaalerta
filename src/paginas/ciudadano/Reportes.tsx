import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Reporte } from '../../lib/supabase'
import { useSesion } from '../../lib/sesion'
import { fecha, tipos } from '../../lib/formato'
import { ErrorAviso, Estado, Prioridad } from '../../componentes/UI'
import { Icono } from '../../componentes/Icono'
export function ListaReportes({ asignados = false }: { asignados?: boolean }) {
  const { session } = useSesion()
  const [reportes, setReportes] = useState<Reporte[]>([]),
    [error, setError] = useState(''),
    [cargando, setCargando] = useState(true),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    void (async () => {
      try {
        const { data, error: fallo } = await supabase
          .from('reportes')
          .select('*')
          .eq(asignados ? 'responsable_id' : 'ciudadano_id', session!.user.id)
          .order('creado_en', { ascending: false })
        if (fallo) throw fallo
        if (vigente) setReportes(data as Reporte[])
      } catch {
        if (vigente) setError('No se pudieron cargar los reportes')
      } finally {
        if (vigente) setCargando(false)
      }
    })()
    return () => {
      vigente = false
    }
  }, [session, asignados, revision])
  return (
    <>
      <header className="bar">
        <h1>{asignados ? 'Mis asignados' : 'Mis reportes'}</h1>
      </header>
      <div className="c g">
        {cargando ? (
          <p role="status">Cargando reportes…</p>
        ) : error ? (
          <>
            <ErrorAviso texto={error} />
            <button className="btn btn-sec" onClick={() => setRevision((v) => v + 1)}>
              Reintentar
            </button>
          </>
        ) : !reportes.length ? (
          <p className="note">
            {asignados ? 'No tiene reportes asignados' : 'Aún no tiene reportes'}
          </p>
        ) : (
          reportes.map((r) => (
            <Link
              key={r.id}
              className="rc"
              to={`${asignados ? '/asignados' : '/reportes'}/${r.id}`}
            >
              <div className="rt">
                <b className="mono">{r.numero}</b>
                {!asignados &&
                  Date.parse(r.estado_cambiado_en) > Date.parse(r.visto_en ?? r.creado_en) && (
                    <span className="nov">Novedad</span>
                  )}
              </div>
              <h3>{tipos[r.tipo]}</h3>
              <p>{r.senas || r.descripcion}</p>
              <div className="rf">
                <Estado valor={r.estado} />
                {asignados ? <Prioridad valor={r.prioridad} /> : <span>{fecha(r.creado_en)}</span>}
              </div>
            </Link>
          ))
        )}
        {!asignados && (
          <Link className="btn btn-pri" to="/reportes/nuevo">
            <Icono nombre="plus" />
            Nuevo reporte
          </Link>
        )}
      </div>
    </>
  )
}
export function Confirmacion() {
  const { id } = useParams(),
    { state } = useLocation()
  const [numero, setNumero] = useState((state as { numero?: string } | null)?.numero ?? ''),
    [error, setError] = useState('')
  useEffect(() => {
    if (!numero)
      void supabase
        .from('reportes')
        .select('numero')
        .eq('id', id!)
        .single()
        .then(({ data, error: fallo }) => {
          if (fallo) setError('No se pudo cargar el reporte')
          else setNumero(data.numero)
        })
  }, [id, numero])
  return (
    <>
      <div className="done">
        <span className="okc" aria-hidden="true">
          <Icono nombre="check" size={38} />
        </span>
        <h1>Reporte enviado</h1>
        <p>La ASADA ya lo recibió. Guarde este número para consultarlo.</p>
        <div className="tick">
          <span>Número de seguimiento</span>
          <b className="mono">{numero || 'Cargando…'}</b>
        </div>
        <ErrorAviso texto={error} />
        <Estado valor="pendiente" />
      </div>
      <div className="c">
        <Link className="btn btn-pri" to={`/reportes/${id}`}>
          Ver mi reporte
        </Link>
        <Link className="btn btn-sec" to="/reportes">
          Volver a mis reportes
        </Link>
      </div>
    </>
  )
}
