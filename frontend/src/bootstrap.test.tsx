import { screen, within } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { start } from './bootstrap'
import { mockApi } from './test/render'

describe('start-up', () => {
  it('renders the app as a guest without waiting for the sign-in check', async () => {
    mockApi({
      'GET /stats': {
        body: {
          activeReports: 3,
          overdueReports: 1,
          resolvedLast90Days: 2,
          medianDaysToResolve: 4,
        },
      },
      'GET /reports': { body: [] },
    })
    const container = document.createElement('div')
    document.body.append(container)

    // A check that never answers, like Keycloak in a browser that blocks third-party cookies.
    let checkStarted = false
    await act(() =>
      start(container, () => {
        checkStarted = true
        return new Promise<void>(() => {})
      }),
    )

    expect(checkStarted).toBe(true)
    const header = await screen.findByRole('banner')
    expect(within(header).getByRole('button', { name: 'Log ind' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Barrierer i nærheden',
    )
    container.remove()
  })
})
