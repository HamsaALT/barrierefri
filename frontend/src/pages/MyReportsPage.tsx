import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { messageFor } from '../api/client'
import { useMyReports } from '../api/queries'
import { useAuth } from '../auth/context'
import { PageTitle } from '../components/PageTitle'
import { SignInPrompt } from '../components/SignInPrompt'
import { Skeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { ago, categoryLabel } from '../lib/labels'

export function MyReportsPage() {
  const { t } = useTranslation()
  const { ready, user } = useAuth()
  const reports = useMyReports(!!user)

  return (
    <div className="page narrow">
      <PageTitle title={t('mine.title')} />
      {!ready || (user && reports.isPending) ? (
        <Skeleton lines={4} />
      ) : !user ? (
        <SignInPrompt title={t('signIn.mineTitle')} text={t('signIn.mineText')} />
      ) : null}
      {reports.isError && <p role="alert">{messageFor(reports.error)}</p>}
      {reports.data?.length === 0 && (
        <p>
          {t('mine.empty')} <Link to="/report">{t('mine.reportLink')}</Link>.
        </p>
      )}
      {reports.data && reports.data.length > 0 && (
        <ul className="plain-list">
          {reports.data.map((r) => (
            <li key={r.id} className="report-item">
              <h2>
                <Link to={`/reports/${r.id}`}>{r.title}</Link>
              </h2>
              <p className="meta">
                <StatusBadge status={r.status} />
                <span>{categoryLabel(r.category)}</span>
                <span>{t('map.reported', { when: ago(r.reportedAt) })}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
