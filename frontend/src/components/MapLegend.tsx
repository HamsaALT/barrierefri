import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUSES, statusLabel } from '../lib/labels'
import { markerSvg } from '../lib/markers'
import { NARROW, useMediaQuery } from '../lib/useMediaQuery'

/**
 * Explains the marker shapes and colours. Shown over the map, outside Leaflet's
 * element. On narrow screens it starts folded into a button (a disclosure inside
 * the heading), so it doesn't cover a quarter of a phone-sized map.
 */
export function MapLegend() {
  const { t } = useTranslation()
  const narrow = useMediaQuery(NARROW)
  const [open, setOpen] = useState(false)
  const expanded = !narrow || open

  return (
    <section
      className={narrow ? 'map-legend collapsible' : 'map-legend'}
      aria-labelledby="legend-title"
    >
      <h2 id="legend-title">
        {narrow ? (
          <button
            type="button"
            className="legend-toggle"
            aria-expanded={open}
            aria-controls="legend-list"
            onClick={() => setOpen(!open)}
          >
            {t('map.legend')}
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        ) : (
          t('map.legend')
        )}
      </h2>
      <ul id="legend-list" hidden={!expanded}>
        {STATUSES.map((s) => (
          <li key={s}>
            <span
              className="legend-marker"
              dangerouslySetInnerHTML={{ __html: markerSvg(s, { size: 22 }) }}
            />
            {statusLabel(s)}
          </li>
        ))}
      </ul>
    </section>
  )
}
