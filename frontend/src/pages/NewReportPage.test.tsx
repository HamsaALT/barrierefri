import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accessibilityViolations } from '../test/axe'
import { mockApi, renderPage } from '../test/render'
import { NewReportPage } from './NewReportPage'

// Leaflet needs real layout, which jsdom doesn't have. The picker is replaced by
// one that reports a fixed spot in Copenhagen.
vi.mock('../components/LocationPicker', () => ({
  LocationPicker: ({ onChange }: { onChange: (c: { lat: number; lng: number }) => void }) => {
    useEffect(() => onChange({ lat: 55.68, lng: 12.57 }), [onChange])
    return <p>Map placeholder</p>
  },
}))

describe('NewReportPage', () => {
  beforeEach(() => {
    mockApi({ 'GET /reports/nearby': { body: [] } })
  })

  it('asks guests to sign in instead of showing the form', () => {
    renderPage(<NewReportPage />, { user: null })

    expect(screen.getByRole('button', { name: 'Log ind for at melde' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send melding' })).not.toBeInTheDocument()
  })

  it('has no detectable accessibility problems', async () => {
    const { container } = renderPage(<NewReportPage />)

    expect(await accessibilityViolations(container)).toEqual([])
  })

  it('shows an error summary that links to each problem and receives focus', async () => {
    const user = userEvent.setup()
    const { container } = renderPage(<NewReportPage />)

    await user.click(screen.getByRole('button', { name: 'Send melding' }))

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveFocus()
    expect(
      screen.getByRole('link', { name: 'Vælg, hvilken type barriere det er.' }),
    ).toHaveAttribute('href', '#category-first')
    expect(screen.getByRole('link', { name: 'Giv meldingen en kort titel.' })).toHaveAttribute(
      'href',
      '#title',
    )
    // The field itself is marked invalid and points at its message.
    expect(screen.getByLabelText('Kort titel (skal udfyldes)')).toHaveAccessibleDescription(
      /Giv meldingen en kort titel/,
    )
    expect(await accessibilityViolations(container)).toEqual([])
  })

  it('can be filled in with the keyboard alone', async () => {
    const calls = mockApi({
      'GET /reports/nearby': { body: [] },
      'POST /reports': { status: 201, body: { id: 42 } },
    })
    const user = userEvent.setup()
    renderPage(<NewReportPage />, { path: '/report' })

    screen.getByLabelText(/Elevator i stykker/).focus()
    await user.keyboard(' ')
    await user.click(screen.getByLabelText('Kort titel (skal udfyldes)'))
    await user.keyboard('Lift out of order')
    await user.click(screen.getByRole('button', { name: 'Send melding' }))

    await waitFor(() => expect(screen.getByText('Other page')).toBeInTheDocument())
    const post = calls.find((c) => c.method === 'POST')
    expect(post?.body).toMatchObject({
      category: 'BrokenElevator',
      title: 'Lift out of order',
      latitude: 55.68,
      longitude: 12.57,
      ignoreNearby: false,
    })
  })

  it('offers to send anyway when the server finds a duplicate', async () => {
    const calls = mockApi({
      'GET /reports/nearby': { body: [] },
      'POST /reports': {
        status: 409,
        body: {
          title: 'Possible duplicate',
          nearby: [
            {
              id: 7,
              category: 'BrokenElevator',
              title: 'Lift broken',
              status: 'Open',
              distanceMeters: 12,
            },
          ],
        },
      },
    })
    const user = userEvent.setup()
    renderPage(<NewReportPage />)

    await user.click(screen.getByLabelText(/Elevator i stykker/))
    await user.type(screen.getByLabelText('Kort titel (skal udfyldes)'), 'Lift out of order')
    await user.click(screen.getByRole('button', { name: 'Send melding' }))

    expect(await screen.findByText('Det er måske allerede meldt')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lift broken' })).toHaveAttribute('href', '/reports/7')

    await user.click(screen.getByRole('button', { name: 'Send min melding alligevel' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2))
    expect(calls.filter((c) => c.method === 'POST')[1].body).toMatchObject({ ignoreNearby: true })
  })

  it('warns about existing reports nearby while filling in the form', async () => {
    mockApi({
      'GET /reports/nearby': {
        body: [
          {
            id: 3,
            category: 'BrokenElevator',
            title: 'Lift at Nørreport',
            status: 'Open',
            distanceMeters: 8,
          },
        ],
      },
    })
    const user = userEvent.setup()
    renderPage(<NewReportPage />)

    await user.click(screen.getByLabelText(/Elevator i stykker/))

    expect(await screen.findByText('Er det allerede meldt her?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lift at Nørreport' })).toBeInTheDocument()
  })
})

describe('NewReportPage steps', () => {
  beforeEach(() => {
    mockApi({ 'GET /reports/nearby': { body: [] } })
  })

  it('splits the form into three numbered steps that screen readers can tell apart', () => {
    renderPage(<NewReportPage />)

    expect(
      screen.getByRole('group', { name: 'Trin 1 af 3: Hvad er problemet? (skal udfyldes)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Trin 2 af 3: Hvor er det? (skal udfyldes)' }),
    ).toContainElement(screen.getByLabelText('Stednavn eller adresse (valgfri)'))
    expect(screen.getByRole('group', { name: 'Trin 3 af 3: Beskriv barrieren' })).toContainElement(
      screen.getByLabelText('Kort titel (skal udfyldes)'),
    )
  })

  it('has the live region for nearby reports in place before any are found', async () => {
    mockApi({
      'GET /reports/nearby': {
        body: [
          { id: 3, category: 'BrokenElevator', title: 'Lift', status: 'Open', distanceMeters: 8 },
        ],
      },
    })
    const user = userEvent.setup()
    const { container } = renderPage(<NewReportPage />)
    const live = container.querySelector('#location [aria-live="polite"]')!
    expect(live).toBeEmptyDOMElement()

    await user.click(screen.getByLabelText(/Elevator i stykker/))

    await waitFor(() => expect(live).toHaveTextContent('Er det allerede meldt her?'))
    expect(live).toHaveTextContent('Åben')
    expect(live).toHaveTextContent('8 m væk')
    expect(await accessibilityViolations(container)).toEqual([])
  })

  it('greets guests with a sign-in card', () => {
    renderPage(<NewReportPage />, { user: null })
    expect(
      screen.getByRole('heading', { level: 2, name: 'Log ind for at melde en barriere' }),
    ).toBeInTheDocument()
  })
})
