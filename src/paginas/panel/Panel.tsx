import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Reporte } from '../../lib/supabase'
import { dia, estados, fecha, ordenarPrioridad, prioridades, tipos } from '../../lib/formato'
import { ErrorAviso, Estado, Prioridad } from '../../componentes/UI'
const inicial = { numero: '', estado: '', prioridad: '', tipo: '', fecha: '' }
const LIMITE = 1000

export function Panel() {
  const [reportes, setReportes] = useState<Reporte[]>([]),
    [filtros, setFiltros] = useState(inicial),
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
          .order('creado_en', { ascending: false })
          .limit(LIMITE)
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
  }, [revision])
  const lista = ordenarPrioridad(
    reportes.filter(
      (r) =>
        (!filtros.numero || r.numero.toLowerCase().includes(filtros.numero.trim().toLowerCase())) &&
        (!filtros.estado || r.estado === filtros.estado) &&
        (!filtros.prioridad || (r.prioridad ?? 'sin') === filtros.prioridad) &&
        (!filtros.tipo || r.tipo === filtros.tipo) &&
        (!filtros.fecha || dia(r.creado_en) === filtros.fecha)
    )
  )
  return (
    <>
      <header className="hd">
        <h1>Reportes</h1>
        {reportes.length >= LIMITE && (
          <p className="note warn" role="status">
            Se muestran los {LIMITE} reportes más recientes.
          </p>
        )}
        <Link className="btn btn-pri" to="/panel/registrar">
          Registrar reporte
        </Link>
      </header>
      <div className="kpis">
        <div>
          <b>{reportes.filter((r) => !r.prioridad).length}</b>
          <span>Nuevos</span>
        </div>
        {Object.entries(estados).map(([v, t]) => (
          <div key={v}>
            <b>{reportes.filter((r) => r.estado === v).length}</b>
            <span>{t}</span>
          </div>
        ))}
      </div>
      <form className="flt" onSubmit={(e) => e.preventDefault()}>
        <label>
          Buscar por número
          <input
            className="inp"
            placeholder="AA-0001"
            value={filtros.numero}
            onChange={(e) => setFiltros({ ...filtros, numero: e.target.value })}
          />
        </label>
        <button className="btn btn-sec">Buscar</button>
        {(
          [
            { clave: 'estado', label: 'Estado', valores: estados },
            { clave: 'prioridad', label: 'Prioridad', valores: prioridades },
            { clave: 'tipo', label: 'Tipo', valores: tipos },
          ] as const
        ).map((f) => (
          <label key={f.clave}>
            {f.label}
            <select
              className="inp"
              value={filtros[f.clave]}
              onChange={(e) => setFiltros({ ...filtros, [f.clave]: e.target.value })}
            >
              <option value="">Todos</option>
              {Object.entries(f.valores).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Fecha
          <input
            type="date"
            className="inp"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
          />
        </label>
        <button className="btn btn-sec" type="button" onClick={() => setFiltros(inicial)}>
          Limpiar filtros
        </button>
      </form>
      <p className="hint">Orden por prioridad · Más antiguos primero</p>
      {cargando ? (
        <p role="status">Cargando reportes…</p>
      ) : error ? (
        <>
          <ErrorAviso texto={error} />
          <button className="btn btn-sec" onClick={() => setRevision((v) => v + 1)}>
            Reintentar
          </button>
        </>
      ) : !lista.length ? (
        <p className="note">
          {reportes.length ? 'No se encontraron reportes' : 'No hay reportes registrados'}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Ubicación</th>
              <th>Prioridad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id} className={!r.prioridad ? 'new' : ''}>
                <td data-label="Número">
                  <Link className="lk mono" to={`/panel/reportes/${r.id}`}>
                    {r.numero}
                  </Link>
                  {!r.prioridad && <span>Nuevo</span>}
                </td>
                <td data-label="Tipo">{tipos[r.tipo]}</td>
                <td data-label="Fecha">{fecha(r.creado_en)}</td>
                <td data-label="Ubicación">{r.senas || `${r.lat}, ${r.lng}`}</td>
                <td data-label="Prioridad">
                  <Prioridad valor={r.prioridad} />
                </td>
                <td data-label="Estado">
                  <Estado valor={r.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
