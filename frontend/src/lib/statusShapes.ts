import type { Status } from '../api/types'

// Each status has its own shape as well as colour, so it reads without colour
// vision and in high-contrast modes. The text label is always shown too.
export const STATUS_SHAPES: Record<Status, string> = {
  Open: '<circle cx="8" cy="8" r="6.5"/>',
  InProgress: '<path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/>',
  Resolved: '<path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke-width="2.5"/>',
  Rejected: '<rect x="2.5" y="2.5" width="11" height="11"/>',
}
