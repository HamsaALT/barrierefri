import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthContext'
import type { User } from '../auth/keycloak'
import { HEADER_COMPACT } from '../lib/useMediaQuery'
import { accessibilityViolations } from '../test/axe'
import { citizen } from '../test/render'
import { Layout } from './Layout'

function renderLayout(user: User | null = null) {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <h1 id="page-title">Kort</h1> },
          { path: '/report', element: <h1 id="page-title">Meld</h1> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider user={user}>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function useCompactScreen() {
  window.matchMedia = (query: string) =>
    ({
      matches: query === HEADER_COMPACT,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

const switcher = () => screen.getByRole('group', { name: 'Sprog' })
const headerRow = () => screen.getByRole('banner').querySelector('.header-inner')!

describe('header on a wide screen', () => {
  it('shows the nav and sign-in buttons, with the language switcher last (top right)', () => {
    renderLayout()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Hovedmenu' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Log ind' })).toBeVisible()
    expect(headerRow().lastElementChild).toBe(switcher())
  })

  it('keeps the skip link as the first thing to tab to', async () => {
    renderLayout()
    await userEvent.setup().tab()
    expect(screen.getByRole('link', { name: 'Gå til hovedindhold' })).toHaveFocus()
  })

  it('has no detectable accessibility problems', async () => {
    const { container } = renderLayout(citizen)
    expect(await accessibilityViolations(container)).toEqual([])
  })
})

describe('header on a compact screen', () => {
  it('folds the nav into a closed menu but keeps the language switcher in the top-right corner', () => {
    useCompactScreen()
    renderLayout()

    const menu = screen.getByRole('button', { name: 'Menu' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveAttribute('aria-controls', 'site-menu')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    // Outside the menu, so it never folds away, and last in the row.
    expect(switcher()).toBeVisible()
    expect(switcher().closest('#site-menu')).toBeNull()
    expect(headerRow().lastElementChild).toBe(switcher())
  })

  it('opens with the button, and the sign-in buttons are next in tab order', async () => {
    useCompactScreen()
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Menu' }))

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true')
    const nav = screen.getByRole('navigation', { name: 'Hovedmenu' })
    expect(within(nav).getByRole('link', { name: 'Kort' })).toBeVisible()
    await user.tab()
    expect(within(nav).getByRole('link', { name: 'Kort' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Log ind' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Opret konto' })).toBeVisible()
  })

  it('closes on Escape and puts focus back on the menu button', async () => {
    useCompactScreen()
    const user = userEvent.setup()
    renderLayout()
    const menu = screen.getByRole('button', { name: 'Menu' })

    await user.click(menu)
    await user.tab()
    await user.keyboard('{Escape}')

    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveFocus()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('closes after following a link in it', async () => {
    useCompactScreen()
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('link', { name: 'Meld en barriere' }))

    expect(await screen.findByRole('heading', { name: 'Meld' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no detectable accessibility problems, open or closed', async () => {
    useCompactScreen()
    const { container } = renderLayout(citizen)
    expect(await accessibilityViolations(container)).toEqual([])

    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu' }))
    expect(await accessibilityViolations(container)).toEqual([])
  })
})
