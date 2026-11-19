import { describe, expect, it } from 'vitest'
import { ApiError, messageFor } from '../api/client'
import { setLanguage } from '../i18n'
import { ago, categoryLabel, confidenceText, formatDate, formatNumber } from './labels'

describe('labels in Danish (the default)', () => {
  const now = new Date('2026-11-18T12:00:00Z')

  it('describes ages in plain Danish', () => {
    expect(ago('2026-11-18T08:00:00Z', now)).toBe('i dag')
    expect(ago('2026-11-17T08:00:00Z', now)).toBe('i går')
    expect(ago('2026-11-08T08:00:00Z', now)).toBe('for 10 dage siden')
  })

  it('writes dates and numbers the Danish way, in Danish time', () => {
    // 23:30 UTC on 30 November is already 1 December in Copenhagen.
    expect(formatDate('2026-11-30T23:30:00Z')).toBe('1. dec. 2026')
    expect(formatNumber(16.5)).toBe('16,5')
    expect(formatNumber(1234.5)).toBe('1.234,5')
  })

  it('turns confidence into Danish words', () => {
    expect(confidenceText(0.85, false)).toBe('Bekræftet af flere')
    expect(confidenceText(0.4, true)).toBe('Flere siger, at det er udbedret')
    expect(categoryLabel('BrokenElevator')).toBe('Elevator i stykker')
  })
})

describe('labels in English', () => {
  const now = new Date('2026-11-18T12:00:00Z')

  it('switches wording and formats', async () => {
    await setLanguage('en')

    expect(ago('2026-11-17T08:00:00Z', now)).toBe('yesterday')
    expect(ago('2026-11-08T08:00:00Z', now)).toBe('10 days ago')
    expect(formatDate('2026-11-30T23:30:00Z')).toBe('1 Dec 2026')
    expect(formatNumber(1234.5)).toBe('1,234.5')
    expect(categoryLabel('BrokenElevator')).toBe('Broken lift')
  })
})

describe('api errors', () => {
  it('finds field errors regardless of casing', () => {
    const error = new ApiError(400, { errors: { Latitude: ['The location must be in Denmark.'] } })

    expect(error.fieldErrors('latitude')).toEqual(['The location must be in Denmark.'])
    expect(error.fieldErrors('title')).toEqual([])
  })

  it('shows its own text for a code instead of the English detail', () => {
    const error = new ApiError(409, {
      code: 'STATUS_TRANSITION_INVALID',
      detail: "A report that is resolved can't be set to in progress.",
      params: { from: 'Resolved', to: 'InProgress' },
    })

    expect(messageFor(error)).toBe(
      'En melding, der er "Udbedret", kan ikke ændres til "Under udbedring".',
    )
  })

  it('falls back on the status code', () => {
    expect(messageFor(new ApiError(401, {}))).toBe('Log ind først.')
    expect(messageFor(new ApiError(0, {}))).toContain('forbindelse')
    expect(messageFor(new Error('boom'))).toBe('Noget gik galt. Prøv igen.')
  })
})
