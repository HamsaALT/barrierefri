import type { Category, Status } from '../api/types'
import i18n, { intlLocale } from '../i18n'

// Shown in this order on the report form.
export const CATEGORIES: Category[] = [
  'BrokenElevator',
  'BlockedSidewalk',
  'SteepCurb',
  'MissingRamp',
  'MissingAudioSignal',
  'InaccessibleEntrance',
  'Other',
]

export const STATUSES: Status[] = ['Open', 'InProgress', 'Resolved', 'Rejected']

export const categoryLabel = (c: Category) => i18n.t(`categories.${c}.label`)
export const statusLabel = (s: Status) => i18n.t(`status.${s}`)

// Dates are always shown in Danish time; only the format follows the language.
const ZONE = 'Europe/Copenhagen'

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    timeZone: ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    timeZone: ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))

/** "21. nov." in Danish, "21 Nov" in English: short enough for a deadline badge. */
export const formatDayMonth = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), { timeZone: ZONE, day: 'numeric', month: 'short' }).format(
    new Date(iso),
  )

/** Whole calendar days from today to the date, in Danish time. Negative when it has passed. */
export function daysUntil(iso: string, now = new Date()): number {
  const day = (d: Date) => {
    const [y, m, dd] = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE })
      .format(d)
      .split('-')
      .map(Number)
    return Date.UTC(y, m - 1, dd)
  }
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000)
}

/** 16,5 in Danish, 16.5 in English. */
export const formatNumber = (value: number) =>
  new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(value)

/**
 * "i dag", "i går", "for 3 dage siden" / "today", "yesterday", "3 days ago".
 * Plain language reads better than timestamps on the public map.
 */
export function ago(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  const relative = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })
  if (days < 60) return relative.format(-Math.max(days, 0), 'day')
  return relative.format(-Math.round(days / 30), 'month')
}

/** Turns the backend's 0–1 confidence into words people understand. */
export function confidenceText(confidence: number, likelyFixed: boolean): string {
  if (likelyFixed) return i18n.t('confidence.likelyFixed')
  if (confidence >= 0.8) return i18n.t('confidence.confirmed')
  if (confidence >= 0.6) return i18n.t('confidence.unconfirmed')
  return i18n.t('confidence.unclear')
}
