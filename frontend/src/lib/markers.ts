import type { Status } from '../api/types'
import { STATUS_SHAPES } from './statusShapes'

// The same values as --status-* in styles.css. Leaflet markers are plain HTML
// strings, so they can't read CSS variables from the stylesheet.
export const STATUS_COLOURS: Record<Status, string> = {
  Open: '#b3261e',
  InProgress: '#8a4a00',
  Resolved: '#1d6b35',
  Rejected: '#4b535a',
}

const INK = '#16191d'

/**
 * A marker: the status shape on a white disc with a ring in the status colour,
 * so it stands out on any map tile. A selected marker is larger with a thick
 * dark ring, which doesn't depend on telling colours apart.
 */
export function markerSvg(status: Status, { size = 32, selected = false } = {}): string {
  const colour = STATUS_COLOURS[status]
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <circle cx="16" cy="16" r="${selected ? 13.5 : 14}" fill="#fff" stroke="${selected ? INK : colour}" stroke-width="${selected ? 4 : 2.5}"/>
    <g transform="translate(8 8)" fill="${colour}" stroke="${colour}">${STATUS_SHAPES[status]}</g>
  </svg>`
}
