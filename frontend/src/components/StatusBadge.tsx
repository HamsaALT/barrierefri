import { useTranslation } from 'react-i18next'
import type { Status } from '../api/types'
import { STATUS_SHAPES } from '../lib/statusShapes'

export function StatusIcon({ status }: { status: Status }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`status-icon status-${status}`}
      dangerouslySetInnerHTML={{ __html: STATUS_SHAPES[status] }}
    />
  )
}

export function StatusBadge({ status, size }: { status: Status; size?: 'large' }) {
  const { t } = useTranslation()
  return (
    <span className={`badge status-${status}${size === 'large' ? ' badge-large' : ''}`}>
      <StatusIcon status={status} />
      {t(`status.${status}`)}
    </span>
  )
}
