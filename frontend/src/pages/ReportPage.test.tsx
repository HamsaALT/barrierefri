import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ReportDetail } from '../api/types'
import { accessibilityViolations } from '../test/axe'
import { mockApi, renderPage, staff } from '../test/render'
import { ReportPage } from './ReportPage'

const report: ReportDetail = {
  id: 1,
  category: 'BrokenElevator',
  title: 'Elevatoren til spor 1 og 2 virker ikke',
  latitude: 55.6833,
  longitude: 12.5716,
  locationHint: 'Nørreport Station',
  status: 'Open',
  reportedAt: '2026-11-15T10:00:00Z',
  confidence: 0.8,
  likelyFixed: false,
  hasPhoto: true,
  description: 'Stuck on the ground floor.',
  responsible: 'DSB',
  dueAt: '2026-11-17T10:00:00Z',
  resolvedAt: null,
  isOverdue: true,
  stillThereCount: 2,
  fixedCount: 0,
  isMine: false,
  myVote: null,
  history: [],
}

describe('ReportPage', () => {
  it('shows the report and has no detectable accessibility problems', async () => {
    mockApi({ 'GET /reports/1': { body: report } })
    const { container } = renderPage(<ReportPage />, { path: '/reports/:id' })

    expect(await screen.findByRole('heading', { level: 1, name: report.title })).toBeInTheDocument()
    expect(screen.getByText('Over fristen')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Barrieren: ${report.title}` })).toBeInTheDocument()
    expect(await accessibilityViolations(container)).toEqual([])
  })

  it('records a confirmation and shows it as pressed', async () => {
    const calls = mockApi({
      'GET /reports/1': { body: report },
      'PUT /reports/1/vote': { body: { ...report, myVote: 'StillThere', stillThereCount: 3 } },
    })
    const user = userEvent.setup()
    renderPage(<ReportPage />, { path: '/reports/:id' })

    await user.click(await screen.findByRole('button', { name: 'Den er der stadig' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Den er der stadig' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ kind: 'StillThere' })
    expect(screen.getByText('Tak, dit svar er gemt.')).toBeInTheDocument()
  })

  it('hides case handling from citizens', async () => {
    mockApi({ 'GET /reports/1': { body: report } })
    renderPage(<ReportPage />, { path: '/reports/:id' })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Sagsbehandling' })).not.toBeInTheDocument()
  })

  it('lets staff change the status', async () => {
    const calls = mockApi({
      'GET /reports/1': { body: report },
      'POST /cases/1/status': { body: { ...report, status: 'InProgress' } },
    })
    const user = userEvent.setup()
    const { container } = renderPage(<ReportPage />, { path: '/reports/:id', user: staff })

    await user.selectOptions(await screen.findByLabelText('Ny status'), 'InProgress')
    await user.type(screen.getByLabelText(/Besked til offentligheden/), 'Sent to DSB')
    await user.click(screen.getByRole('button', { name: 'Opdatér status' }))

    await waitFor(() => expect(screen.getAllByText('Under udbedring').length).toBeGreaterThan(0))
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      status: 'InProgress',
      note: 'Sent to DSB',
    })
    expect(await accessibilityViolations(container)).toEqual([])
  })
})

describe('ReportPage status and deadline', () => {
  it('puts the status and deadline first, with an Overdue badge that has an icon', async () => {
    mockApi({ 'GET /reports/1': { body: report } })
    renderPage(<ReportPage />, { path: '/reports/:id' })

    await screen.findByRole('heading', { level: 1 })
    const summary = document.querySelector('.status-summary')!
    expect(summary).toHaveTextContent('Åben')
    expect(summary).toHaveTextContent('Frist 17. nov.')
    const badge = within(summary as HTMLElement).getByText('Over fristen')
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('shows a countdown and no Overdue badge before the deadline', async () => {
    const due = new Date(Date.now() + 3 * 86_400_000).toISOString()
    mockApi({ 'GET /reports/1': { body: { ...report, isOverdue: false, dueAt: due } } })
    renderPage(<ReportPage />, { path: '/reports/:id' })

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Om 3 dage')).toBeInTheDocument()
    expect(screen.queryByText('Over fristen')).not.toBeInTheDocument()
  })
})

describe('ReportPage confirmations', () => {
  it('shows the counts on the buttons and reads them as descriptions', async () => {
    mockApi({ 'GET /reports/1': { body: { ...report, fixedCount: 1 } } })
    renderPage(<ReportPage />, { path: '/reports/:id' })

    const still = await screen.findByRole('button', { name: 'Den er der stadig' })
    expect(still).toHaveTextContent('2')
    expect(still).toHaveAccessibleDescription('2 personer siger, at den er der stadig')
    expect(screen.getByRole('button', { name: 'Den er udbedret nu' })).toHaveAccessibleDescription(
      '1 person siger, at den er udbedret',
    )
  })

  it('shows guests the counts and a sign-in button instead of vote buttons', async () => {
    mockApi({ 'GET /reports/1': { body: report } })
    renderPage(<ReportPage />, { path: '/reports/:id', user: null })

    expect(await screen.findByRole('button', { name: 'Log ind for at bekræfte' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Den er der stadig' })).not.toBeInTheDocument()
    expect(screen.getByText(/2 personer siger, at den er der stadig/)).toBeInTheDocument()
  })
})

describe('ReportPage sources', () => {
  // Enter and Space on a summary are browser behaviour that jsdom doesn't run;
  // they were checked in Chromium. Here: closed by default, opens, no axe issues.
  it('folds "where does this come from" away until it is opened', async () => {
    mockApi({ 'GET /reports/1': { body: report } })
    const user = userEvent.setup()
    const { container } = renderPage(<ReportPage />, { path: '/reports/:id' })
    await screen.findByRole('heading', { level: 1 })

    const details = container.querySelector('details.sources')!
    const summary = within(details as HTMLElement).getByText('Hvor kommer oplysningerne fra?')
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'Frist for udbedring' })).not.toBeVisible()

    await user.click(summary)

    expect(details).toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'Frist for udbedring' })).toBeVisible()
    expect(await accessibilityViolations(container)).toEqual([])
  })
})

describe('ReportPage on your own report', () => {
  it('shows the "you reported it" note on its own line above the one vote button', async () => {
    mockApi({ 'GET /reports/1': { body: { ...report, isMine: true } } })
    const { container } = renderPage(<ReportPage />, { path: '/reports/:id' })

    const note = await screen.findByText(/Det er dig, der har meldt den/)
    const buttons = container.querySelector('.vote-buttons')!
    expect(buttons).toHaveClass('single')
    expect(buttons).not.toContainElement(note)
    expect(note.compareDocumentPosition(buttons) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Den er der stadig' })).not.toBeInTheDocument()
    expect(
      within(buttons as HTMLElement).getByRole('button', { name: 'Den er udbedret nu' }),
    ).toBeVisible()
    expect(await accessibilityViolations(container)).toEqual([])
  })
})
