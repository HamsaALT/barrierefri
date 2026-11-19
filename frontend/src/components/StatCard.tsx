import type { ReactNode } from 'react'

/** A warning triangle with an exclamation mark, for numbers that need attention. */
export function WarningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2 19 18H1Z" fill="currentColor" />
      <path d="M10 8v4.5M10 14.5v1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * One number with a label under it. The warning tone adds an icon and a tinted
 * background, so it never depends on colour alone.
 */
export function StatCard({
  value,
  unit,
  label,
  tone = 'default',
}: {
  value: ReactNode
  unit?: string
  label: string
  tone?: 'default' | 'warning'
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-value">
        {tone === 'warning' && <WarningIcon />}
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
