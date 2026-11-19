import { useTranslation } from 'react-i18next'

/**
 * Grey placeholder bars while data loads, so a page is never blank. Screen
 * readers hear "Loading…" once instead of the bars. The shimmer stops under
 * prefers-reduced-motion.
 */
export function Skeleton({ lines = 3, label }: { lines?: number; label?: string }) {
  const { t } = useTranslation()
  return (
    <output className="skeleton-block" data-testid="skeleton">
      <span className="visually-hidden">{label ?? t('app.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton" aria-hidden="true" />
      ))}
    </output>
  )
}
