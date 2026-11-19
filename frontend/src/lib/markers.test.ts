import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STATUS_COLOURS, markerSvg } from './markers'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const TOKENS = {
  Open: 'status-open',
  InProgress: 'status-progress',
  Resolved: 'status-resolved',
  Rejected: 'status-rejected',
} as const

describe('map markers', () => {
  it.each(Object.entries(TOKENS))('%s uses the same colour as --%s', (status, name) => {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
    expect(STATUS_COLOURS[status as keyof typeof TOKENS]).toBe(match?.[1])
  })

  it('makes the selected marker larger with a dark ring', () => {
    const normal = markerSvg('Open')
    const selected = markerSvg('Open', { size: 44, selected: true })
    expect(normal).toContain('width="32"')
    expect(selected).toContain('width="44"')
    expect(selected).toContain('stroke="#16191d"')
    expect(normal).not.toContain('stroke="#16191d"')
  })
})
