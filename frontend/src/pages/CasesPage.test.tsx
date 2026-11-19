import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { CaseRow } from '../api/types'
import { NARROW } from '../lib/useMediaQuery'
import { accessibilityViolations } from '../test/axe'
import { mockApi, renderPage, staff } from '../test/render'
import { CasesPage } from './CasesPage'

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

const row = (id: number, title: string, overrides: Partial<CaseRow> = {}): CaseRow => ({
  id,
  title,
  category: 'BrokenElevator',
  locationHint: 'Nørreport Station',
  status: 'Open',
  responsible: 'DSB',
  reportedAt: days(-5),
  dueAt: days(2),
  isOverdue: false,
  stillThereCount: 2,
  fixedCount: 0,
  confidence: 0.8,
  likelyFixed: false,
  ...overrides,
})

// The API's order is deliberately wrong here: the page must still put overdue first.
const rows = [
  row(1, 'Rampen mangler', { dueAt: days(5) }),
  row(2, 'Elevatoren virker ikke', { dueAt: days(-3), isOverdue: true }),
  row(3, 'Lydsignalet er stille', { dueAt: days(1), status: 'InProgress' }),
]

function setup(extra: Record<string, { status?: number; body?: unknown }> = {}) {
  const calls = mockApi({ 'GET /cases': { body: rows }, ...extra })
  const view = renderPage(<CasesPage />, { path: '/cases', user: staff })
  return { calls, ...view }
}

describe('CasesPage', () => {
  it('puts overdue cases first, with a badge and how many days over', async () => {
    setup()
    const table = await screen.findByRole('table', { name: 'Sager sorteret efter frist' })
    const bodyRows = within(table).getAllByRole('row').slice(1)

    expect(
      bodyRows.map((r) => within(r).getByRole('rowheader').querySelector('a')?.textContent),
    ).toEqual(['Elevatoren virker ikke', 'Lydsignalet er stille', 'Rampen mangler'])
    const badge = within(bodyRows[0]).getByText('3 dage over fristen')
    expect(badge).toHaveClass('overdue-badge')
    expect(badge.querySelector('svg')).not.toBeNull()
    expect(bodyRows[1]).toHaveTextContent('om 1 dag')
    expect(bodyRows[1]).not.toHaveTextContent('over fristen')
    expect(screen.getByText('1 over fristen')).toBeInTheDocument()
  })

  it('changes status from the queue and tells the user, with focus on the message', async () => {
    const user = userEvent.setup()
    const { calls } = setup({
      'POST /cases/2/status': { body: { ...rows[1], status: 'InProgress', history: [] } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Start udbedring: Elevatoren virker ikke' }),
    )

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        status: 'InProgress',
        note: '',
      }),
    )
    const message = await screen.findByText('»Elevatoren virker ikke« er nu Under udbedring.')
    await waitFor(() => expect(message).toHaveFocus())
  })

  it('offers only the changes that make sense for each status', async () => {
    setup()
    await screen.findByRole('table')
    expect(
      screen.getByRole('button', { name: 'Markér udbedret: Lydsignalet er stille' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Genåbn: Lydsignalet er stille' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start udbedring: Lydsignalet er stille' }),
    ).not.toBeInTheDocument()
  })

  it('filters with the status dropdown and the overdue chip', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    await screen.findByRole('table')

    await user.click(screen.getByRole('checkbox', { name: 'Kun over fristen' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'InProgress')

    await waitFor(() => {
      const last = new URL(calls.at(-1)!.path, 'http://x')
      expect(last.searchParams.get('overdueOnly')).toBe('true')
      expect(last.searchParams.get('status')).toBe('InProgress')
    })
  })

  it('has no detectable accessibility problems', async () => {
    const { container } = setup()
    await screen.findByRole('table')
    expect(await accessibilityViolations(container)).toEqual([])
  })

  describe('on a narrow screen', () => {
    afterEach(() => {
      Reflect.deleteProperty(window, 'matchMedia')
    })

    it('shows one card per case instead of a table', async () => {
      window.matchMedia = (query: string) =>
        ({
          matches: query === NARROW,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList
      const { container } = setup()

      const cards = await screen.findAllByRole('listitem')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(cards).toHaveLength(3)
      expect(within(cards[0]).getByRole('heading', { level: 2 })).toHaveTextContent(
        'Elevatoren virker ikke',
      )
      expect(cards[0]).toHaveTextContent('3 dage over fristen')
      expect(await accessibilityViolations(container)).toEqual([])
    })
  })
})
