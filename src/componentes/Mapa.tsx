import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { Marker as Marcador } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ErrorAviso } from './UI'
export type Punto = [number, number]
const valores = (import.meta.env.VITE_MAPA_CENTRO || '10.3833,-85.7167').split(',').map(Number)
const centro: Punto =
  valores.length === 2 && valores.every(Number.isFinite)
    ? [valores[0], valores[1]]
    : [10.3833, -85.7167]
const icono = divIcon({
  className: 'marcador',
  html: '<svg width="34" height="42" viewBox="0 0 24 30"><path fill="#B4341F" stroke="white" d="M12 29S1 18 1 11a11 11 0 0 1 22 0c0 7-11 18-11 18Z"/><circle cx="12" cy="11" r="4" fill="white"/></svg>',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
})
function Control({ punto, cambiar }: { punto: Punto | null; cambiar?: (p: Punto) => void }) {
  const mapa = useMap()
  useMapEvents({ click: (e) => cambiar?.([e.latlng.lat, e.latlng.lng]) })
  useEffect(() => {
    if (punto) mapa.panTo(punto)
  }, [mapa, punto])
  return (
    punto && (
      <Marker
        position={punto}
        icon={icono}
        draggable={Boolean(cambiar)}
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as Marcador).getLatLng()
            cambiar?.([p.lat, p.lng])
          },
        }}
      />
    )
  )
}
function Mapa({ punto, cambiar }: { punto: Punto | null; cambiar?: (p: Punto) => void }) {
  const [fallo, setFallo] = useState(false)
  return (
    <>
      <MapContainer className="map" center={punto ?? centro} zoom={14} style={{ height: 240 }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFallo(true) }}
        />
        <Control punto={punto} cambiar={cambiar} />
      </MapContainer>
      {fallo && (
        <p className="hint">No se pudo cargar el mapa. Puede escribir las señas del lugar.</p>
      )}
    </>
  )
}
export function MapaSelector({
  punto,
  cambiar,
}: {
  punto: Punto | null
  cambiar: (p: Punto) => void
}) {
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  function localizar() {
    setError('')
    setCargando(true)
    const fallo = () => {
      setError('No se pudo obtener su ubicación')
      setCargando(false)
    }
    if (!navigator.geolocation) return fallo()
    navigator.geolocation.getCurrentPosition(
      (p) => {
        cambiar([p.coords.latitude, p.coords.longitude])
        setCargando(false)
      },
      fallo,
      { timeout: 12000 }
    )
  }
  return (
    <div className="sec">
      <Mapa punto={punto} cambiar={cambiar} />
      <button type="button" className="btn btn-sec sm" disabled={cargando} onClick={localizar}>
        {cargando ? 'Buscando ubicación…' : 'Usar mi ubicación'}
      </button>
      <ErrorAviso texto={error} />
    </div>
  )
}
export function MapaVista({ punto }: { punto: Punto }) {
  return (
    <>
      <Mapa punto={punto} />
      <a
        className="lk"
        target="_blank"
        rel="noopener noreferrer"
        href={`https://www.openstreetmap.org/?mlat=${punto[0]}&mlon=${punto[1]}#map=18/${punto[0]}/${punto[1]}`}
      >
        Abrir en mapas
      </a>
    </>
  )
}
