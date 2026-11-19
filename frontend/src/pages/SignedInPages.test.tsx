import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { accessibilityViolations } from '../test/axe'
import { citizen, mockApi, renderPage } from '../test/render'
import { CasesPage } from './CasesPage'
import { MyReportsPage } from './MyReportsPage'

describe.each([
  ['My reports', '/mine', <MyReportsPage key="mine" />, 'Log ind for at se dine meldinger'],
  ['Case queue', '/cases', <CasesPage key="cases" />, 'Log ind for at se sagskøen'],
])('%s for a guest', (_, path, page, prompt) => {
  it('asks them to sign in instead of requesting data', async () => {
    const calls = mockApi({})
    const { container } = renderPage(page, { path, user: null })

    expect(screen.getByRole('heading', { level: 2, name: prompt })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log ind' })).toBeInTheDocument()
    expect(calls).toEqual([])
    expect(await accessibilityViolations(container)).toEqual([])
  })

  it('shows a skeleton, not a sign-in prompt, while sign-in is still being checked', () => {
    const calls = mockApi({})
    const router = createMemoryRouter([{ path, element: page }], { initialEntries: [path] })
    // No user given, so the provider follows Keycloak, which hasn't answered yet.
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('skeleton')).toHaveTextContent('Henter…')
    expect(screen.queryByRole('button', { name: 'Log ind' })).not.toBeInTheDocument()
    expect(calls).toEqual([])
  })
})

describe('Case queue for a signed-in citizen', () => {
  it('explains it is for staff and does not request cases', () => {
    const calls = mockApi({})
    renderPage(<CasesPage />, { path: '/cases', user: citizen })

    expect(
      screen.getByText('Sagskøen er for medarbejdere i kommuner og hos transportselskaber.'),
    ).toBeInTheDocument()
    expect(calls).toEqual([])
  })
})
