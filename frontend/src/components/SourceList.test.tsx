import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { accessibilityViolations } from '../test/axe'
import { SourceList, type SourceEntry } from './SourceList'

const entries: SourceEntry[] = [
  {
    title: 'sources.deadline.title',
    publisher: 'sources.ours',
    text: 'sources.deadline.text',
    own: true,
  },
  {
    title: 'sources.map.title',
    publisher: 'sources.osm',
    text: 'sources.map.text',
    url: 'https://www.openstreetmap.org/copyright',
  },
]

describe('SourceList', () => {
  it('marks our own deadlines so they are not mistaken for law', () => {
    render(<SourceList heading="sources.heading" entries={entries} footnote="sources.footnote" />)

    const deadline = screen.getByRole('heading', { name: 'Frist for udbedring' }).closest('li')!
    expect(within(deadline).getByText('Barrierefris egne mål')).toHaveClass('own')
    expect(deadline).toHaveTextContent('kommer ikke fra en lov')
    expect(screen.getByText(/ikke en myndighed/)).toBeInTheDocument()
  })

  it('links to the source and says it opens a new tab', () => {
    render(<SourceList heading="sources.heading" entries={entries} />)

    const link = screen.getByRole('link', { name: /^Se kilden\s*\(åbner i en ny fane\)$/ })
    expect(link).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  })

  it('has no detectable accessibility problems', async () => {
    const { container } = render(
      <SourceList heading="sources.heading" entries={entries} footnote="sources.footnote" />,
    )
    expect(await accessibilityViolations(container)).toEqual([])
  })
})
