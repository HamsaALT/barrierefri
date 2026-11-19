import { useSyncExternalStore } from 'react'

/** True while the media query matches. False where matchMedia doesn't exist (tests, old browsers). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  )
}

/** The width where the map page switches to its phone layout (same as in styles.css). */
export const NARROW = '(max-width: 900px)'

/** Below this the header folds its nav into a menu button (same as in styles.css). */
export const HEADER_COMPACT = '(max-width: 1023px)'
