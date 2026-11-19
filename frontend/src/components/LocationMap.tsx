import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import type { Status } from '../api/types'
import { markerSvg } from '../lib/markers'
import { MapLabel } from './ReportMap'

/**
 * A small map with one marker, for the top of a report. The place is also
 * written out in text on the page, so the map is never the only source.
 */
export function LocationMap({
  latitude,
  longitude,
  status,
}: {
  latitude: number
  longitude: number
  status: Status
}) {
  const { t, i18n } = useTranslation()
  const icon = L.divIcon({
    className: 'map-marker',
    html: markerSvg(status, { size: 40, selected: true }),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      className="map location-map"
      scrollWheelZoom={false}
      keyboard
    >
      <TileLayer
        key={i18n.language}
        attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">${t('app.osmContributors')}</a>`}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapLabel label={t('report.mapLabel')} />
      <Marker position={[latitude, longitude]} icon={icon} keyboard={false} interactive={false} />
    </MapContainer>
  )
}
