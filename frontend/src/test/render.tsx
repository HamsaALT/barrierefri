import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthContext'
import type { User } from '../auth/keycloak'

export const citizen: User = { id: 'u-1', name: 'Maja', roles: ['citizen'] }
export const staff: User = { id: 'u-2', name: 'Sara', roles: ['citizen', 'staff'] }

/** Renders a page with routing, React Query and a fake signed-in (or signed-out) user. */
export function renderPage(page: ReactElement, { path = '/', user = citizen as User | null } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path, element: page },
      { path: '*', element: <p>Other page</p> },
    ],
    { initialEntries: [path.replace(':id', '1')] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={user}>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

/** Replaces fetch with canned JSON responses keyed by "METHOD /path" (query string ignored). */
export function mockApi(routes: Record<string, { status?: number; body?: unknown }>) {
  const calls: { method: string; path: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const key = `${method} ${url.pathname.replace(/^\/api/, '')}`
    calls.push({
      method,
      path: url.pathname + url.search,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })
    const route = routes[key]
    if (!route)
      return new Response(JSON.stringify({ detail: `No mock for ${key}` }), { status: 500 })
    return new Response(route.status === 204 ? null : JSON.stringify(route.body ?? {}), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return calls
}
