import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { COPENHAGEN } from '../lib/geo'
import { FieldError } from './FieldError'
import { MapLabel } from './ReportMap'

export interface LatLng {
  lat: number
  lng: number
}

function CentreWatcher({ onChange }: { onChange: (centre: LatLng) => void }) {
  const map = useMapEvents({ moveend: () => onChange(map.getCenter()) })
  useEffect(() => onChange(map.getCenter()), [map, onChange])
  return null
}

function Recentre({ to }: { to: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (to) map.setView(to, 18)
  }, [map, to])
  return null
}

/**
 * The barrier goes where the crosshair is. Moving the map instead of dropping a
 * pin means it works with arrow keys (Leaflet pans the focused map), touch and mouse
 * alike, so there is no mouse-only step.
 */
export function LocationPicker({ onChange }: { onChange: (centre: LatLng) => void }) {
  const { t, i18n } = useTranslation()
  const [jumpTo, setJumpTo] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  // A translation key, so the message follows a language switch.
  const [locateError, setLocateError] = useState<string | null>(null)

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError('picker.noGeolocation')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setJumpTo({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => {
        setLocating(false)
        setLocateError('picker.locateFailed')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="picker">
      <p id="picker-help" className="hint">
        {t('picker.help')}
      </p>
      <div className="picker-map">
        <MapContainer center={COPENHAGEN} zoom={16} className="map map-small" keyboard>
          <TileLayer
            key={i18n.language}
            attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">${t('app.osmContributors')}</a>`}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapLabel label={t('picker.mapLabel')} describedBy="picker-help" />
          <CentreWatcher onChange={onChange} />
          <Recentre to={jumpTo} />
        </MapContainer>
        <div className="crosshair" aria-hidden="true" />
      </div>
      <button type="button" className="button secondary" onClick={locateMe} disabled={locating}>
        {locating ? t('picker.locating') : t('picker.locate')}
      </button>
      {locateError && <FieldError role="alert">{t(locateError)}</FieldError>}
    </div>
  )
}
