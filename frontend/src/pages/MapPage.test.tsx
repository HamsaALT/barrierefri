import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ReportSummary } from '../api/types'
import { accessibilityViolations } from '../test/axe'
import { NARROW } from '../lib/useMediaQuery'
import { mockApi, renderPage } from '../test/render'
import { MapPage } from './MapPage'

const report = (id: number, title: string, status: ReportSummary['status']): ReportSummary => ({
  id,
  title,
  status,
  category: 'BrokenElevator',
  latitude: 55.68,
  longitude: 12.57,
  locationHint: 'Nørreport Station',
  reportedAt: new Date().toISOString(),
  confidence: 0.9,
  likelyFixed: false,
  hasPhoto: false,
})

const stats = {
  activeReports: 24,
  overdueReports: 13,
  resolvedLast90Days: 42,
  medianDaysToResolve: 16,
}

function setup(reports: ReportSummary[] = [report(1, 'Elevatoren virker ikke', 'Open')]) {
  const calls = mockApi({ 'GET /stats': { body: stats }, 'GET /reports': { body: reports } })
  const view = renderPage(<MapPage />, { user: null })
  return { calls, ...view }
}

const reportRequests = (calls: { path: string }[]) =>
  calls.filter((c) => c.path.startsWith('/api/reports?')).map((c) => new URL(c.path, 'http://x'))

describe('MapPage', () => {
  it('shows the national figures as three cards, with overdue marked by an icon and text', async () => {
    setup()
    const figures = await screen.findByRole('list', { name: 'I hele Danmark' })
    const cards = within(figures).getAllByRole('listitem')
    expect(cards.map((c) => c.textContent)).toEqual([
      '24Åbne meldinger',
      '13Over fristen',
      '16 dageTypisk tid til udbedring',
    ])
    expect(cards[1].querySelector('.stat-card.warning svg')).not.toBeNull()
  })

  it('filters by type with a labelled dropdown', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    const type = screen.getByRole('combobox', { name: 'Type barriere' })
    expect(type).toHaveDisplayValue('Alle typer')

    await user.selectOptions(type, 'Elevator i stykker')

    expect(type).toHaveDisplayValue('Elevator i stykker')
    await waitFor(() =>
      expect(reportRequests(calls).at(-1)?.searchParams.get('category')).toBe('BrokenElevator'),
    )
  })

  it('can include fixed and closed reports with a checkbox chip', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    const toggle = screen.getByRole('checkbox', { name: 'Vis udbedrede og lukkede' })

    await user.click(toggle)

    expect(toggle).toBeChecked()
    await waitFor(() =>
      expect(reportRequests(calls).at(-1)?.searchParams.get('includeClosed')).toBe('true'),
    )
  })

  it('lists every report on the map and marks the one shown on the map', async () => {
    const user = userEvent.setup()
    setup([report(1, 'Elevatoren virker ikke', 'Open'), report(2, 'Rampen mangler', 'InProgress')])
    const list = await screen.findByRole('region', { name: 'Meldinger i dette område' })
    const items = await within(list).findAllByRole('listitem')
    expect(items).toHaveLength(2)
    // Each report has a marker on the map as well.
    await waitFor(() => expect(document.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2))

    await user.click(
      within(items[1]).getByRole('button', { name: 'Vis på kortet: Rampen mangler' }),
    )

    expect(items[1]).toHaveAttribute('data-selected', 'true')
    expect(items[0]).toHaveAttribute('data-selected', 'false')
    expect(document.querySelector('.leaflet-marker-icon.selected')).not.toBeNull()
  })

  it('explains what to do when there are no reports in the area', async () => {
    setup([])
    expect(await screen.findByRole('heading', { name: 'Ingen meldinger her' })).toBeInTheDocument()
  })

  it('shows a legend with every status as a shape and text', () => {
    setup()
    const legend = screen.getByRole('region', { name: 'Forklaring' })
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent?.trim()),
    ).toEqual(['Åben', 'Under udbedring', 'Udbedret', 'Lukket'])
    // Wide screens show it open, with no toggle.
    expect(within(legend).queryByRole('button')).not.toBeInTheDocument()
  })

  describe('on a narrow screen', () => {
    beforeEach(() => {
      window.matchMedia = (query: string) =>
        ({
          matches: query === NARROW,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList
    })
    afterEach(() => {
      // jsdom has no matchMedia of its own.
      Reflect.deleteProperty(window, 'matchMedia')
    })

    it('folds the legend behind a button, collapsed until opened', async () => {
      const user = userEvent.setup()
      const { container } = setup()
      const toggle = screen.getByRole('button', { name: 'Forklaring' })
      const list = container.querySelector('#legend-list')!
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveAttribute('aria-controls', 'legend-list')
      expect(list).not.toBeVisible()

      await user.click(toggle)

      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(list).toBeVisible()

      await user.keyboard('{Enter}')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(await accessibilityViolations(container)).toEqual([])
    })
  })

  it('has no detectable accessibility problems', async () => {
    const { container } = setup()
    await screen.findByRole('link', { name: 'Elevatoren virker ikke' })
    expect(await accessibilityViolations(container)).toEqual([])
  })
})
