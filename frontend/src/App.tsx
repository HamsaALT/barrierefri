import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { ApiError } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/context'
import { Layout } from './components/Layout'
import { PageTitle } from './components/PageTitle'
import { MapPage } from './pages/MapPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A 4xx won't fix itself by retrying.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="page narrow">
      <PageTitle title={t('notFound.title')} />
      <p>
        <Link to="/">{t('notFound.link')}</Link>
      </p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <MapPage /> },
      // The map is the landing page; everything else loads when first visited.
      {
        path: 'report',
        lazy: async () => ({ Component: (await import('./pages/NewReportPage')).NewReportPage }),
      },
      {
        path: 'reports/:id',
        lazy: async () => ({ Component: (await import('./pages/ReportPage')).ReportPage }),
      },
      {
        path: 'mine',
        lazy: async () => ({ Component: (await import('./pages/MyReportsPage')).MyReportsPage }),
      },
      {
        path: 'cases',
        lazy: async () => ({ Component: (await import('./pages/CasesPage')).CasesPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

/**
 * Data loads as a guest while sign-in is still being checked. When a session
 * turns up (or ends), refetch so personal fields like "my vote" are right.
 */
function RefetchOnUserChange() {
  const client = useQueryClient()
  const userId = useAuth().user?.id ?? null
  const previous = useRef(userId)
  useEffect(() => {
    if (previous.current === userId) return
    previous.current = userId
    void client.invalidateQueries()
  }, [client, userId])
  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RefetchOnUserChange />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
