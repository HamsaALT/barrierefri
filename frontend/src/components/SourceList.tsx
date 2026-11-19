import { useTranslation } from 'react-i18next'

export interface SourceEntry {
  /** Translation keys for what the figure is, who it comes from, and how it's used. */
  title: string
  publisher: string
  text: string
  url?: string
  /** Barrierefri's own choices and calculations, so they never look official. */
  own?: boolean
}

/**
 * Where each number on the page comes from. Our own rules are marked so nobody
 * mistakes a Barrierefri target for a legal deadline.
 */
export function SourceList({
  heading,
  entries,
  footnote,
  collapsed = false,
}: {
  heading: string
  entries: SourceEntry[]
  footnote?: string
  /** Folded into a native details/summary, closed until opened. */
  collapsed?: boolean
}) {
  const { t } = useTranslation()
  if (collapsed) {
    return (
      <details className="sources disclosure">
        <summary>
          <span>{t(heading)}</span>
        </summary>
        <Entries entries={entries} footnote={footnote} />
      </details>
    )
  }
  return (
    <section className="sources" aria-labelledby="sources-title">
      <h2 id="sources-title">{t(heading)}</h2>
      <Entries entries={entries} footnote={footnote} />
    </section>
  )
}

function Entries({ entries, footnote }: { entries: SourceEntry[]; footnote?: string }) {
  const { t } = useTranslation()
  return (
    <>
      <ul>
        {entries.map((s) => (
          <li key={s.title}>
            <div className="source-head">
              <h3>{t(s.title)}</h3>
              <span className={s.own ? 'publisher own' : 'publisher'}>{t(s.publisher)}</span>
            </div>
            <p>
              {t(s.text)}{' '}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener">
                  {t('sources.seeSource')}
                  <span className="visually-hidden"> {t('sources.newTab')}</span>
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
      {footnote && <p className="footnote">{t(footnote)}</p>}
    </>
  )
}
