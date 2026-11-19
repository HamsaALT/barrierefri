import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useReportsInArea, useStats } from '../api/queries'
import type { Bounds, Category, ReportSummary } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { FilterChip } from '../components/FilterChip'
import { MapLegend } from '../components/MapLegend'
import { PageTitle } from '../components/PageTitle'
import { ReportMap } from '../components/ReportMap'
import { Skeleton } from '../components/Skeleton'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { CATEGORIES, ago, categoryLabel, confidenceText, formatNumber } from '../lib/labels'

export function MapPage() {
  const { t } = useTranslation()
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [category, setCategory] = useState<Category | ''>('')
  const [includeClosed, setIncludeClosed] = useState(false)
  const [focus, setFocus] = useState<[number, number] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  const reports = useReportsInArea(bounds, category, includeClosed)
  const onBoundsChange = useCallback((b: Bounds) => setBounds(b), [])
  const list = reports.data ?? []

  const showOnMap = (r: ReportSummary) => {
    setFocus([r.latitude, r.longitude])
    setSelectedId(r.id)
    // On a phone the list is below the map, so bring the map back into view.
    if (stage.current && stage.current.getBoundingClientRect().top < 0) {
      stage.current.scrollIntoView?.({ block: 'start' })
    }
  }

  return (
    <div className="map-page">
      <div className="map-head">
        <PageTitle title={t('map.title')} />
        <p className="lead">{t('map.lead')}</p>
        <Stats />
      </div>

      <form
        className="map-filters"
        onSubmit={(e) => e.preventDefault()}
        aria-label={t('map.filters')}
      >
        <div className="inline-field">
          <label htmlFor="category-filter">{t('map.type')}</label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
          >
            <option value="">{t('map.allTypes')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-row">
          <FilterChip type="checkbox" checked={includeClosed} onChange={setIncludeClosed}>
            {t('map.includeClosed')}
          </FilterChip>
        </div>
      </form>

      <div className="map-stage" ref={stage}>
        <ReportMap
          reports={list}
          onBoundsChange={onBoundsChange}
          focus={focus}
          selectedId={selectedId}
        />
        <MapLegend />
      </div>

      <section aria-labelledby="list-title" className="map-list">
        <div className="map-list-head">
          <h2 id="list-title">{t('map.listTitle')}</h2>
          <p aria-live="polite" className="hint">
            {reports.isError
              ? t('map.loadError')
              : reports.data && t('map.count', { count: list.length })}
          </p>
        </div>
        {reports.isPending && !reports.isError ? (
          <Skeleton lines={5} />
        ) : reports.data && list.length === 0 ? (
          <div className="report-cards">
            <EmptyState title={t('map.emptyTitle')}>{t('map.emptyText')}</EmptyState>
          </div>
        ) : (
          <ul className="report-cards">
            {list.map((r) => (
              <li key={r.id} className="report-card" data-selected={r.id === selectedId}>
                <h3>
                  <Link to={`/reports/${r.id}`}>{r.title}</Link>
                </h3>
                <p className="meta">
                  <StatusBadge status={r.status} />
                  <span>{categoryLabel(r.category)}</span>
                  <span>{t('map.reported', { when: ago(r.reportedAt) })}</span>
                </p>
                {r.locationHint && <p>{r.locationHint}</p>}
                <p className="hint">{confidenceText(r.confidence, r.likelyFixed)}</p>
                <button type="button" className="button-link" onClick={() => showOnMap(r)}>
                  {t('map.showOnMap')}
                  <span className="visually-hidden">: {r.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Three numbers for the whole country. Placeholders keep the layout steady while they load. */
function Stats() {
  const { t } = useTranslation()
  const stats = useStats()
  if (stats.isError) return null
  if (!stats.data) return <Skeleton lines={2} label={t('map.statsLoading')} />

  const s = stats.data
  return (
    <ul className="stat-cards" aria-label={t('map.statsLabel')}>
      <li>
        <StatCard value={s.activeReports} label={t('map.statOpen')} />
      </li>
      <li>
        <StatCard
          value={s.overdueReports}
          label={t('map.statOverdue')}
          tone={s.overdueReports > 0 ? 'warning' : 'default'}
        />
      </li>
      {s.medianDaysToResolve !== null && (
        <li>
          <StatCard
            value={formatNumber(s.medianDaysToResolve)}
            unit={t('map.statDays', { count: s.medianDaysToResolve })}
            label={t('map.statTypical')}
          />
        </li>
      )}
    </ul>
  )
}
