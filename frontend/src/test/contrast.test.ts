import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Reads the colour tokens straight from styles.css, so changing a colour there
// re-runs these checks against the real values.
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const token = (name: string): string => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`Token --${name} not found`)
  return match[1]
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('colour contrast (WCAG 2.2)', () => {
  it('matches the reference values for black and white', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  // Normal-size text needs 4.5:1 (success criterion 1.4.3).
  it.each([
    ['ink', 'bg'],
    ['ink', 'surface'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['accent', 'bg'],
    ['accent-dark', 'accent-soft'],
    ['danger', 'bg'],
    ['warn-ink', 'warn-soft'],
    ['status-open', 'bg'],
    ['status-progress', 'bg'],
    ['status-resolved', 'bg'],
    ['status-rejected', 'bg'],
  ])('text --%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it('white text on the accent button is at least 4.5:1', () => {
    expect(contrast('#ffffff', token('accent'))).toBeGreaterThanOrEqual(4.5)
  })

  // Pairs added with the redesign: sunken panels, cards, tinted status badges,
  // the overdue stat card and checked filter chips.
  it.each([
    ['ink', 'surface-sunken'],
    ['muted', 'surface-sunken'],
    ['accent', 'surface'],
    ['accent-dark', 'surface-sunken'],
    ['danger', 'danger-soft'],
    ['status-open', 'status-open-soft'],
    ['status-progress', 'status-progress-soft'],
    ['status-resolved', 'status-resolved-soft'],
    ['status-rejected', 'status-rejected-soft'],
    ['status-open', 'surface'],
    ['status-progress', 'surface'],
    ['status-resolved', 'surface'],
    ['status-rejected', 'surface'],
  ])('text --%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['status-open', 'status-progress', 'status-resolved', 'status-rejected', 'danger'])(
    'white text on --%s is at least 4.5:1',
    (bg) => {
      expect(contrast('#ffffff', token(bg))).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each([
    ['line', 'surface'],
    ['line', 'surface-sunken'],
    ['focus', 'surface'],
    ['focus', 'surface-sunken'],
    ['warn-ink', 'warn-soft'],
  ])('UI --%s on --%s is at least 3:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })

  // Borders of form controls and the focus ring need 3:1 (1.4.11 non-text contrast).
  it.each([
    ['line', 'bg'],
    ['focus', 'bg'],
    ['focus', 'accent-soft'],
  ])('UI --%s on --%s is at least 3:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })
})
