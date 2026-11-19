import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { messageFor } from '../api/client'
import { useCases, useChangeStatus } from '../api/queries'
import type { CaseRow, Status } from '../api/types'
import { useAuth } from '../auth/context'
import { EmptyState } from '../components/EmptyState'
import { FieldError } from '../components/FieldError'
import { FilterChip } from '../components/FilterChip'
import { PageTitle } from '../components/PageTitle'
import { SignInPrompt } from '../components/SignInPrompt'
import { Skeleton } from '../components/Skeleton'
import { WarningIcon } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { STATUSES, categoryLabel, daysUntil, formatDate, statusLabel } from '../lib/labels'
import { NARROW, useMediaQuery } from '../lib/useMediaQuery'

/**
 * The status changes staff can make straight from the queue. Rejecting needs a
 * public reason, so that one stays on the report page.
 */
const QUICK_ACTIONS: Record<Status, Status[]> = {
  Open: ['InProgress', 'Resolved'],
  InProgress: ['Resolved', 'Open'],
  Resolved: ['Open'],
  Rejected: ['Open'],
}

/** Overdue first, then the nearest deadline, whatever order the API used. */
function queueOrder(rows: CaseRow[]): CaseRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.isOverdue) - Number(a.isOverdue) ||
      new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )
}

export function CasesPage() {
  const { t } = useTranslation()
  const { ready, user, isStaff } = useAuth()
  const [status, setStatus] = useState<Status | ''>('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const announcer = useRef<HTMLParagraphElement>(null)
  const cases = useCases(status, overdueOnly, isStaff)
  const narrow = useMediaQuery(NARROW)
  const rows = useMemo(() => queueOrder(cases.data ?? []), [cases.data])
  const overdue = rows.filter((c) => c.isOverdue).length

  if (!isStaff) {
    return (
      <div className="page narrow">
        <PageTitle title={t('cases.title')} />
        {!ready ? (
          <Skeleton lines={4} />
        ) : !user ? (
          <SignInPrompt title={t('signIn.casesTitle')} text={t('cases.staffOnly')} />
        ) : (
          <p>{t('cases.staffOnly')}</p>
        )}
      </div>
    )
  }

  // The row may leave the list after a change (e.g. fixed cases under "active"),
  // so focus goes to the message rather than being lost with the button.
  const changed = (c: CaseRow, to: Status) => {
    setAnnouncement(t('cases.changed', { title: c.title, status: statusLabel(to) }))
    requestAnimationFrame(() => announcer.current?.focus())
  }

  return (
    <div className="page cases-page">
      <PageTitle title={t('cases.title')} />
      <p className="lead">{t('cases.lead')}</p>

      <form
        className="queue-filters"
        onSubmit={(e) => e.preventDefault()}
        aria-label={t('cases.filters')}
      >
        <div className="inline-field">
          <label htmlFor="status-filter">{t('cases.status')}</label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | '')}
          >
            <option value="">{t('cases.activeStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <FilterChip type="checkbox" checked={overdueOnly} onChange={setOverdueOnly}>
          {t('cases.overdueOnly')}
        </FilterChip>
        <p className="queue-count" aria-live="polite">
          {cases.data && (
            <>
              {t('cases.count', { count: rows.length })}
              {overdue > 0 && (
                <span className="overdue-count">
                  <WarningIcon size={16} />
                  {t('cases.overdueCount', { count: overdue })}
                </span>
              )}
            </>
          )}
        </p>
      </form>

      <p ref={announcer} tabIndex={-1} className="queue-announcement" aria-live="polite">
        {announcement}
      </p>

      {cases.isError && (
        <div className="alert error" role="alert">
          {messageFor(cases.error)}
        </div>
      )}
      {cases.isPending && <Skeleton lines={6} />}
      {cases.data && rows.length === 0 && <EmptyState title={t('cases.empty')} />}

      {rows.length > 0 &&
        (narrow ? (
          <ul className="case-cards">
            {rows.map((c) => (
              <li key={c.id} className={c.isOverdue ? 'case-card is-overdue' : 'case-card'}>
                <h2>
                  <Link to={`/reports/${c.id}`}>{c.title}</Link>
                </h2>
                <p className="cell-sub">
                  {categoryLabel(c.category)}
                  {c.locationHint && ` · ${c.locationHint}`}
                </p>
                <div className="case-card-row">
                  <StatusBadge status={c.status} />
                  <Deadline c={c} />
                </div>
                <dl className="case-card-facts">
                  <div>
                    <dt>{t('cases.colResponsible')}</dt>
                    <dd>
                      <Responsible c={c} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('cases.colConfirmations')}</dt>
                    <dd>
                      <Confirmations c={c} />
                    </dd>
                  </div>
                </dl>
                <CaseActions c={c} onChanged={changed} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <caption className="visually-hidden">{t('cases.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('cases.colReport')}</th>
                  <th scope="col">{t('cases.colStatus')}</th>
                  <th scope="col">{t('cases.colDeadline')}</th>
                  <th scope="col">{t('cases.colResponsible')}</th>
                  <th scope="col">{t('cases.colConfirmations')}</th>
                  <th scope="col">{t('cases.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={c.isOverdue ? 'is-overdue' : undefined}>
                    <th scope="row">
                      <Link to={`/reports/${c.id}`}>{c.title}</Link>
                      <span className="cell-sub">
                        {categoryLabel(c.category)}
                        {c.locationHint && ` · ${c.locationHint}`}
                      </span>
                    </th>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <Deadline c={c} />
                    </td>
                    <td>
                      <Responsible c={c} />
                    </td>
                    <td>
                      <Confirmations c={c} />
                    </td>
                    <td>
                      <CaseActions c={c} onChanged={changed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}

/** The date, a countdown ("3 dage over" / "om 2 dage"), and a badge when it's late. */
function Deadline({ c }: { c: CaseRow }) {
  const { t } = useTranslation()
  const days = daysUntil(c.dueAt)
  return (
    <div className="deadline-cell">
      <span>{formatDate(c.dueAt)}</span>
      {c.isOverdue ? (
        <span className="badge overdue-badge">
          <WarningIcon size={14} />
          {t('cases.daysOver', { count: Math.max(-days, 1) })}
        </span>
      ) : (
        <span className="countdown">
          {days === 0 ? t('cases.dueToday') : t('cases.dueIn', { count: days })}
        </span>
      )}
    </div>
  )
}

function Responsible({ c }: { c: CaseRow }) {
  const { t } = useTranslation()
  return <>{c.responsible ?? <span className="muted">{t('cases.notAssigned')}</span>}</>
}

function Confirmations({ c }: { c: CaseRow }) {
  const { t } = useTranslation()
  return (
    <>
      {t('cases.votes', { stillThere: c.stillThereCount, fixed: c.fixedCount })}
      {c.likelyFixed && <strong className="cell-sub likely-fixed">{t('cases.likelyFixed')}</strong>}
    </>
  )
}

/** One-click status changes. Each button's name includes the case, for screen reader lists. */
function CaseActions({
  c,
  onChanged,
}: {
  c: CaseRow
  onChanged: (c: CaseRow, to: Status) => void
}) {
  const { t } = useTranslation()
  const change = useChangeStatus(c.id)
  return (
    <div className="case-actions">
      {QUICK_ACTIONS[c.status].map((to) => (
        <button
          key={to}
          type="button"
          className="button secondary small"
          disabled={change.isPending}
          onClick={() =>
            change.mutate({ status: to, note: '' }, { onSuccess: () => onChanged(c, to) })
          }
        >
          {t(`cases.actions.${to}`)}
          <span className="visually-hidden">: {c.title}</span>
        </button>
      ))}
      {change.isError && <FieldError role="alert">{messageFor(change.error)}</FieldError>}
    </div>
  )
}
