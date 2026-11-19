import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ApiError, messageFor } from '../api/client'
import { useCreateReport, useNearby } from '../api/queries'
import type { Category, NearbyReport } from '../api/types'
import { useAuth } from '../auth/context'
import { EmptyState } from '../components/EmptyState'
import { FieldError } from '../components/FieldError'
import { LocationPicker, type LatLng } from '../components/LocationPicker'
import { PageTitle } from '../components/PageTitle'
import { StatusBadge } from '../components/StatusBadge'
import { CATEGORIES } from '../lib/labels'
import { useDebounced } from '../lib/useDebounced'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Field = 'category' | 'title' | 'description' | 'locationHint' | 'photo' | 'location'
/** Translation keys, not texts, so messages follow a language switch. */
type Errors = Partial<Record<Field, string>>

export function NewReportPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()

  if (!user) {
    return (
      <div className="page narrow">
        <PageTitle title={t('newReport.title')} />
        <EmptyState
          title={t('newReport.signInTitle')}
          action={
            <button type="button" className="button" onClick={() => login('/report')}>
              {t('newReport.signIn')}
            </button>
          }
        >
          {t('newReport.signInText')}
        </EmptyState>
      </div>
    )
  }
  return <ReportForm />
}

/**
 * The server's validation messages are in English, so they're not shown as they
 * are. Which field failed (and the error code for photos) is enough to pick our
 * own message in the user's language.
 */
function serverErrors(error: ApiError, title: string): Errors {
  const has = (field: string) => error.fieldErrors(field).length > 0
  const found: Errors = {}
  if (has('title'))
    found.title = title.length > 100 ? 'validation.titleTooLong' : 'validation.title'
  if (has('description')) found.description = 'validation.descriptionTooLong'
  if (has('locationHint')) found.locationHint = 'validation.placeTooLong'
  if (has('latitude') || has('longitude')) found.location = 'validation.location'
  if (error.problem.code?.startsWith('PHOTO_')) found.photo = `errors.${error.problem.code}`
  return found
}

function ReportForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useCreateReport()
  const summaryRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<Category | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationHint, setLocationHint] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [centre, setCentre] = useState<LatLng>({ lat: 55.6795, lng: 12.5755 })
  const [errors, setErrors] = useState<Errors>({})
  const [duplicates, setDuplicates] = useState<NearbyReport[] | null>(null)

  const onCentreChange = useCallback((c: LatLng) => setCentre({ lat: c.lat, lng: c.lng }), [])
  const debouncedCentre = useDebounced(centre, 400)
  const nearby = useNearby(debouncedCentre.lat, debouncedCentre.lng, category)

  const errorList = (Object.entries(errors) as [Field, string | undefined][]).filter(
    (entry): entry is [Field, string] => !!entry[1],
  )

  // Move focus to the error summary so keyboard and screen reader users hear what went wrong.
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) summaryRef.current?.focus()
  }, [errors])

  function validate(): Errors {
    const found: Errors = {}
    if (!category) found.category = 'validation.category'
    if (!title.trim()) found.title = 'validation.title'
    if (photo && !PHOTO_TYPES.includes(photo.type)) found.photo = 'validation.photoType'
    else if (photo && photo.size > MAX_PHOTO_BYTES) found.photo = 'validation.photoSize'
    return found
  }

  function submit(event: FormEvent, ignoreNearby = false) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    create.mutate(
      {
        report: {
          category: category as Category,
          title,
          description,
          locationHint,
          latitude: centre.lat,
          longitude: centre.lng,
          ignoreNearby,
        },
        photo,
      },
      {
        onSuccess: (created) => navigate(`/reports/${created.id}`),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409 && error.problem.nearby) {
            setDuplicates(error.problem.nearby)
            return
          }
          if (error instanceof ApiError && error.status === 400) {
            setErrors(serverErrors(error, title))
          }
        },
      },
    )
  }

  const describedBy = (field: Field, hint?: string) =>
    [hint, errors[field] ? `${field}-error` : undefined].filter(Boolean).join(' ') || undefined

  const fieldError = (field: Field) =>
    errors[field] && <FieldError id={`${field}-error`}>{t(errors[field])}</FieldError>

  return (
    <div className="page narrow report-form">
      <PageTitle title={t('newReport.title')} />
      <p className="lead">{t('newReport.required')}</p>

      {errorList.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <h2>{t('newReport.problem')}</h2>
          <ul>
            {errorList.map(([field, key]) => (
              <li key={field}>
                <a href={`#${field === 'category' ? 'category-first' : field}`}>{t(key)}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {create.isError &&
        !(create.error instanceof ApiError && [400, 409].includes(create.error.status)) && (
          <div className="alert error" role="alert">
            <p>{messageFor(create.error)}</p>
          </div>
        )}

      <form onSubmit={submit} noValidate>
        <fieldset
          className="form-step"
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <StepLegend step={1}>{t('newReport.categoryLegend')}</StepLegend>
          {fieldError('category')}
          <div className="choice-grid">
            {CATEGORIES.map((c, i) => {
              const id = i === 0 ? 'category-first' : `category-${c}`
              return (
                <div key={c} className="choice">
                  <input
                    type="radio"
                    name="category"
                    id={id}
                    value={c}
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    aria-describedby={`hint-${c}`}
                  />
                  <label htmlFor={id}>
                    <span className="choice-label">{t(`categories.${c}.label`)}</span>
                    <span id={`hint-${c}`} className="hint">
                      {t(`categories.${c}.hint`)}
                    </span>
                  </label>
                </div>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="form-step" id="location">
          <StepLegend step={2}>{t('newReport.locationLegend')}</StepLegend>
          <LocationPicker onChange={onCentreChange} />
          {fieldError('location')}

          <div className="field">
            <label htmlFor="locationHint">{t('newReport.placeLabel')}</label>
            <input
              id="locationHint"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              maxLength={200}
              aria-invalid={!!errors.locationHint}
              aria-describedby={describedBy('locationHint', 'locationHint-hint')}
            />
            <p id="locationHint-hint" className="hint">
              {t('newReport.placeHint')}
            </p>
            {fieldError('locationHint')}
          </div>

          {/* Always in the page, so screen readers announce matches when they appear. */}
          <div className="nearby-slot" aria-live="polite">
            {nearby.data && nearby.data.length > 0 && (
              <NearbyCard
                title={t('newReport.nearbyTitle')}
                text={t('newReport.nearbyText', { count: nearby.data.length })}
                reports={nearby.data}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="form-step">
          <StepLegend step={3}>{t('newReport.describeLegend')}</StepLegend>
          <div className="field">
            <label htmlFor="title">{t('newReport.titleLabel')}</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              aria-invalid={!!errors.title}
              aria-describedby={describedBy('title', 'title-hint')}
              autoComplete="off"
            />
            <p id="title-hint" className="hint">
              {t('newReport.titleHint')}
            </p>
            {fieldError('title')}
          </div>

          <div className="field">
            <label htmlFor="description">{t('newReport.detailsLabel')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              aria-invalid={!!errors.description}
              aria-describedby={describedBy('description')}
            />
            {fieldError('description')}
          </div>

          <div className="field">
            <label htmlFor="photo">{t('newReport.photoLabel')}</label>
            <input
              id="photo"
              type="file"
              accept={PHOTO_TYPES.join(',')}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              aria-invalid={!!errors.photo}
              aria-describedby={describedBy('photo', 'photo-hint')}
            />
            <p id="photo-hint" className="hint">
              {t('newReport.photoHint')}
            </p>
            {fieldError('photo')}
          </div>
        </fieldset>

        {duplicates && (
          <div className="alert warning duplicate-card" role="alert">
            <h2>{t('newReport.duplicateTitle')}</h2>
            <NearbyList reports={duplicates} />
            <p>{t('newReport.duplicateText')}</p>
            <button type="button" className="button secondary" onClick={(e) => submit(e, true)}>
              {t('newReport.sendAnyway')}
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="button large" disabled={create.isPending}>
            {create.isPending ? t('newReport.sending') : t('newReport.send')}
          </button>
        </div>
      </form>
    </div>
  )
}

/** A numbered step heading. Screen readers hear "Trin 1 af 3: …" as part of the group's name. */
function StepLegend({ step, children }: { step: number; children: string }) {
  const { t } = useTranslation()
  return (
    <legend className="step-legend">
      <span className="step-number" aria-hidden="true">
        {step}
      </span>
      <span>
        <span className="visually-hidden">{t('newReport.stepOf', { step, total: 3 })}:</span>{' '}
        {children}
      </span>
    </legend>
  )
}

/** "Is this already reported?": the matches with status and distance, each a link. */
function NearbyCard({
  title,
  text,
  reports,
}: {
  title: string
  text: string
  reports: NearbyReport[]
}) {
  return (
    <div className="alert info suggestion-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <NearbyList reports={reports} />
    </div>
  )
}

function NearbyList({ reports }: { reports: NearbyReport[] }) {
  const { t } = useTranslation()
  return (
    <ul className="nearby-list">
      {reports.map((n) => (
        <li key={n.id}>
          <Link to={`/reports/${n.id}`}>{n.title}</Link>
          <span className="nearby-meta">
            <StatusBadge status={n.status} />
            <span>{t('newReport.metresAway', { distance: n.distanceMeters })}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
