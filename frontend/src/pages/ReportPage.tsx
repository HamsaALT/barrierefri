import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { messageFor } from '../api/client'
import { useAssign, useChangeStatus, useReport, useVote } from '../api/queries'
import type { ReportDetail, Status, VoteKind } from '../api/types'
import { useAuth } from '../auth/context'
import { EmptyState } from '../components/EmptyState'
import { FieldError } from '../components/FieldError'
import { LocationMap } from '../components/LocationMap'
import { PageTitle } from '../components/PageTitle'
import { Skeleton } from '../components/Skeleton'
import { SourceList, type SourceEntry } from '../components/SourceList'
import { WarningIcon } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import {
  ago,
  categoryLabel,
  confidenceText,
  daysUntil,
  formatDate,
  formatDateTime,
  formatDayMonth,
  statusLabel,
} from '../lib/labels'

const SOURCES: SourceEntry[] = [
  {
    title: 'sources.reports.title',
    publisher: 'sources.users',
    text: 'sources.reports.text',
  },
  {
    title: 'sources.deadline.title',
    publisher: 'sources.ours',
    text: 'sources.deadline.text',
    own: true,
  },
  {
    title: 'sources.confirmations.title',
    publisher: 'sources.calculated',
    text: 'sources.confirmations.text',
    own: true,
  },
  {
    title: 'sources.map.title',
    publisher: 'sources.osm',
    text: 'sources.map.text',
    url: 'https://www.openstreetmap.org/copyright',
  },
]

export function ReportPage() {
  const { t } = useTranslation()
  const id = Number(useParams().id)
  const report = useReport(id)
  const { isStaff } = useAuth()

  if (report.isPending) {
    return (
      <div className="page narrow">
        <Skeleton lines={6} label={t('report.loading')} />
      </div>
    )
  }
  if (report.isError) {
    return (
      <div className="page narrow">
        <PageTitle title={t('report.notFound')} />
        <EmptyState
          title={messageFor(report.error)}
          action={
            <Link to="/" className="button secondary">
              {t('report.backToMap')}
            </Link>
          }
        />
      </div>
    )
  }

  const r = report.data
  return (
    <div className="page report-page">
      <p className="breadcrumb">
        <Link to="/">{t('report.backToMap')}</Link>
      </p>

      <div className={r.hasPhoto ? 'report-media with-photo' : 'report-media'}>
        <LocationMap latitude={r.latitude} longitude={r.longitude} status={r.status} />
        {r.hasPhoto && (
          <img
            className="photo"
            src={`/api/reports/${r.id}/photo`}
            alt={t('report.photoAlt', { title: r.title })}
          />
        )}
      </div>

      <PageTitle title={r.title} />
      <StatusSummary report={r} />

      <div className="report-body">
        <div className="report-facts">
          {r.description && <p className="description">{r.description}</p>}
          <dl className="fact-list">
            <div>
              <dt>{t('report.category')}</dt>
              <dd>
                <span className="tag">{categoryLabel(r.category)}</span>
              </dd>
            </div>
            {r.locationHint && (
              <div>
                <dt>{t('report.place')}</dt>
                <dd>{r.locationHint}</dd>
              </div>
            )}
            <div>
              <dt>{t('report.reportedOn')}</dt>
              <dd>
                <time dateTime={r.reportedAt}>{formatDate(r.reportedAt)}</time>{' '}
                <span className="muted">({ago(r.reportedAt)})</span>
              </dd>
            </div>
            <div>
              <dt>{t('report.responsible')}</dt>
              <dd>{r.responsible ?? <span className="muted">{t('report.notAssigned')}</span>}</dd>
            </div>
          </dl>
        </div>
        <div className="report-side">
          <VotePanel report={r} />
          {isStaff && <StaffPanel report={r} />}
        </div>
        <div className="report-rest">
          <section aria-labelledby="history-title">
            <h2 id="history-title">{t('report.history')}</h2>
            <ol className="timeline">
              <li>
                <time dateTime={r.reportedAt}>{formatDateTime(r.reportedAt)}</time>{' '}
                {t('report.historyReported')}
              </li>
              {r.history.map((h) => (
                <li key={h.changedAt}>
                  <time dateTime={h.changedAt}>{formatDateTime(h.changedAt)}</time>{' '}
                  {t('report.historyChanged', { from: statusLabel(h.from), to: statusLabel(h.to) })}
                  {h.note && <p className="note">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          <SourceList
            heading="sources.heading"
            entries={SOURCES}
            footnote="sources.footnote"
            collapsed
          />
        </div>
      </div>
    </div>
  )
}

/**
 * The two things people come for: what state the barrier is in, and when it
 * should be fixed. Overdue gets its own badge with an icon, not just red text.
 */
function StatusSummary({ report: r }: { report: ReportDetail }) {
  const { t } = useTranslation()
  const active = r.status === 'Open' || r.status === 'InProgress'
  const days = daysUntil(r.dueAt)

  return (
    <div className={r.isOverdue && active ? 'status-summary is-overdue' : 'status-summary'}>
      <StatusBadge status={r.status} size="large" />
      {active ? (
        <div className="deadline">
          <p className="deadline-date">{t('report.due', { date: formatDayMonth(r.dueAt) })}</p>
          <p className="deadline-countdown">
            {r.isOverdue
              ? t('report.daysOverdue', { count: Math.max(-days, 1) })
              : days === 0
                ? t('report.dueToday')
                : t('report.dueIn', { count: days })}
          </p>
        </div>
      ) : (
        r.resolvedAt && (
          <p className="deadline-date">
            {t('report.fixedOn', { date: formatDayMonth(r.resolvedAt) })}
          </p>
        )
      )}
      {r.isOverdue && active && (
        <span className="badge overdue-badge">
          <WarningIcon size={16} />
          {t('report.overdueBadge')}
        </span>
      )}
    </div>
  )
}

function VotePanel({ report }: { report: ReportDetail }) {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const vote = useVote(report.id)
  const active = report.status === 'Open' || report.status === 'InProgress'
  if (!active) return null

  const choose = (kind: VoteKind) => vote.mutate(report.myVote === kind ? null : kind)
  // Hidden, but still read as the buttons' descriptions (aria-describedby).
  const counts = (
    <div hidden>
      <span id="still-there-count">
        {t('vote.stillThereCount', { count: report.stillThereCount })}
      </span>
      <span id="fixed-count">{t('vote.fixedCount', { count: report.fixedCount })}</span>
    </div>
  )

  return (
    <section className="panel vote-panel" aria-labelledby="vote-title">
      <h2 id="vote-title">{t('vote.title')}</h2>
      <p className="hint">{confidenceText(report.confidence, report.likelyFixed)}</p>
      {user && report.isMine && <p className="vote-mine">{t('vote.mine')}</p>}
      {user ? (
        <div className={report.isMine ? 'vote-buttons single' : 'vote-buttons'}>
          {counts}
          {!report.isMine && (
            <VoteButton
              label={t('vote.stillThere')}
              count={report.stillThereCount}
              countId="still-there-count"
              pressed={report.myVote === 'StillThere'}
              disabled={vote.isPending}
              onClick={() => choose('StillThere')}
            />
          )}
          <VoteButton
            label={t('vote.fixed')}
            count={report.fixedCount}
            countId="fixed-count"
            pressed={report.myVote === 'Fixed'}
            disabled={vote.isPending}
            onClick={() => choose('Fixed')}
          />
        </div>
      ) : (
        <>
          <div className="vote-buttons" aria-hidden="true">
            <VoteTally label={t('vote.stillThere')} count={report.stillThereCount} />
            <VoteTally label={t('vote.fixed')} count={report.fixedCount} />
          </div>
          <p className="visually-hidden">
            {t('vote.stillThereCount', { count: report.stillThereCount })}.{' '}
            {t('vote.fixedCount', { count: report.fixedCount })}.
          </p>
          <button type="button" className="button" onClick={() => login()}>
            {t('vote.signIn')}
          </button>
        </>
      )}
      <p className="hint">{t('vote.hint')}</p>
      <p aria-live="polite" className="hint">
        {vote.isError
          ? messageFor(vote.error)
          : vote.isSuccess && (report.myVote ? t('vote.saved') : t('vote.removed'))}
      </p>
    </section>
  )
}

/**
 * A large confirmation button with the running count. The count is visual
 * only inside the button and read as its description, so the button's name
 * stays the action ("Den er der stadig").
 */
function VoteButton(props: {
  label: string
  count: number
  countId: string
  pressed: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="vote-button"
      aria-pressed={props.pressed}
      aria-describedby={props.countId}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <span className="vote-label">{props.label}</span>
      <span className="vote-count" aria-hidden="true">
        {props.count}
      </span>
    </button>
  )
}

/** The same tile without the button, for guests. */
function VoteTally({ label, count }: { label: string; count: number }) {
  return (
    <div className="vote-button is-tally">
      <span className="vote-label">{label}</span>
      <span className="vote-count">{count}</span>
    </div>
  )
}

const NEXT_STATUSES: Record<Status, Status[]> = {
  Open: ['InProgress', 'Resolved', 'Rejected'],
  InProgress: ['Open', 'Resolved', 'Rejected'],
  Resolved: ['Open'],
  Rejected: ['Open'],
}

function StaffPanel({ report }: { report: ReportDetail }) {
  const { t } = useTranslation()
  const changeStatus = useChangeStatus(report.id)
  const assign = useAssign(report.id)
  const options = NEXT_STATUSES[report.status]
  const [status, setStatus] = useState<Status>(options[0])
  const [note, setNote] = useState('')
  const [responsible, setResponsible] = useState(report.responsible ?? '')

  // The previous choice may not be valid after the status changed.
  const selected = options.includes(status) ? status : options[0]

  return (
    <section className="panel staff" aria-labelledby="staff-title">
      <h2 id="staff-title">{t('staff.title')}</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          changeStatus.mutate({ status: selected, note }, { onSuccess: () => setNote('') })
        }}
      >
        <div className="field">
          <label htmlFor="new-status">{t('staff.newStatus')}</label>
          <select
            id="new-status"
            value={selected}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status-note">
            {selected === 'Rejected' ? t('staff.noteRequired') : t('staff.noteOptional')}
          </label>
          <textarea
            id="status-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            aria-describedby={changeStatus.isError ? 'status-error' : undefined}
          />
        </div>
        {changeStatus.isError && (
          <FieldError id="status-error" role="alert">
            {messageFor(changeStatus.error)}
          </FieldError>
        )}
        <button type="submit" className="button" disabled={changeStatus.isPending}>
          {t('staff.update')}
        </button>
        <span aria-live="polite" className="hint">
          {changeStatus.isSuccess && ` ${t('staff.updated')}`}
        </span>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          assign.mutate(responsible)
        }}
      >
        <div className="field">
          <label htmlFor="responsible">{t('staff.responsible')}</label>
          <input
            id="responsible"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            maxLength={100}
          />
        </div>
        <button type="submit" className="button secondary" disabled={assign.isPending}>
          {t('staff.save')}
        </button>
        <span aria-live="polite" className="hint">
          {assign.isSuccess && ` ${t('staff.saved')}`}
        </span>
      </form>
    </section>
  )
}
