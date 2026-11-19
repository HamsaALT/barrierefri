import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { Bounds, ReportSummary, Status } from '../api/types'
import { categoryLabel, statusLabel } from '../lib/labels'
import { COPENHAGEN } from '../lib/geo'
import { markerSvg } from '../lib/markers'

const icons = new Map<string, L.DivIcon>()
function iconFor(status: Status, selected: boolean): L.DivIcon {
  const key = `${status}-${selected}`
  let icon = icons.get(key)
  if (!icon) {
    const size = selected ? 44 : 32
    icon = L.divIcon({
      className: selected ? 'map-marker selected' : 'map-marker',
      html: markerSvg(status, { size, selected }),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    icons.set(key, icon)
  }
  return icon
}

function toBounds(map: L.Map): Bounds {
  const b = map.getBounds()
  return { minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() }
}

function BoundsWatcher({ onChange }: { onChange: (bounds: Bounds) => void }) {
  const map = useMapEvents({ moveend: () => onChange(toBounds(map)) })
  useEffect(() => onChange(toBounds(map)), [map, onChange])
  return null
}

/** Leaflet owns the map element, so its accessible name has to be set on it directly. */
export function MapLabel({ label, describedBy }: { label: string; describedBy?: string }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('role', 'application')
    el.setAttribute('aria-label', label)
    if (describedBy) el.setAttribute('aria-describedby', describedBy)
  }, [map, label, describedBy])
  return null
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.setView(target, Math.max(map.getZoom(), 16))
  }, [map, target])
  return null
}

interface Props {
  reports: ReportSummary[]
  onBoundsChange: (bounds: Bounds) => void
  focus?: [number, number] | null
  selectedId?: number | null
}

/**
 * The map is a visual extra. Everything on it is also in the list next to it,
 * which is the main way to use the page with a keyboard or screen reader.
 */
export function ReportMap({ reports, onBoundsChange, focus = null, selectedId = null }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.language
  // Leaflet only reads a marker's title when it's created, so markers are keyed by
  // language and rebuilt when it changes.
  const markers = useMemo(
    () =>
      reports.map((r) => (
        <Marker
          key={`${r.id}-${language}`}
          position={[r.latitude, r.longitude]}
          icon={iconFor(r.status, r.id === selectedId)}
          zIndexOffset={r.id === selectedId ? 1000 : 0}
          title={t('map.markerTitle', {
            title: r.title,
            category: categoryLabel(r.category),
            status: statusLabel(r.status),
          })}
          eventHandlers={{ click: () => navigate(`/reports/${r.id}`) }}
        />
      )),
    [reports, navigate, t, language, selectedId],
  )

  return (
    <MapContainer center={COPENHAGEN} zoom={14} className="map" keyboard>
      <TileLayer
        key={language}
        attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">${t('app.osmContributors')}</a>`}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapLabel label={t('map.mapLabel')} />
      <BoundsWatcher onChange={onBoundsChange} />
      <FlyTo target={focus} />
      {markers}
    </MapContainer>
  )
}
