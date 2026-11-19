import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Sets the browser tab title and renders the page's h1, which receives focus after navigation. */
export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  const { t } = useTranslation()
  const suffix = t('titleSuffix')

  useEffect(() => {
    document.title = `${title} – ${suffix}`
  }, [title, suffix])

  return (
    <h1 id="page-title" tabIndex={-1}>
      {children ?? title}
    </h1>
  )
}
