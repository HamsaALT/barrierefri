import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { accessibilityViolations } from '../test/axe'
import i18n, { STORAGE_KEY, initI18n } from './index'
import da from './da.json'
import en from './en.json'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const result = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') result.set(path, value)
    else flatten(value, path).forEach((v, k) => result.set(k, v))
  }
  return result
}

const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort()

function Heading() {
  const { t } = useTranslation()
  return <h1>{t('map.title')}</h1>
}

describe('translation files', () => {
  const danish = flatten(da as Tree)
  const english = flatten(en as Tree)

  it('have exactly the same keys', () => {
    expect([...danish.keys()].sort()).toEqual([...english.keys()].sort())
  })

  it('have no empty texts', () => {
    expect([...danish, ...english].filter(([, text]) => text.trim() === '')).toEqual([])
  })

  it('use the same placeholders in both languages', () => {
    const mismatched = [...danish.keys()].filter(
      (key) =>
        placeholders(danish.get(key) ?? '').join() !== placeholders(english.get(key) ?? '').join(),
    )
    expect(mismatched).toEqual([])
  })
})

describe('language', () => {
  it('starts in Danish on a first visit, even if the browser prefers English', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')

    await initI18n()

    expect(i18n.language).toBe('da')
    expect(document.documentElement.lang).toBe('da')
  })

  it('switches the visible text and the html lang attribute', async () => {
    const user = userEvent.setup()
    render(
      <>
        <LanguageSwitcher />
        <Heading />
      </>,
    )
    expect(screen.getByRole('heading')).toHaveTextContent('Barrierer i nærheden')

    await user.click(screen.getByRole('button', { name: 'EN – English' }))

    expect(screen.getByRole('heading')).toHaveTextContent('Barriers near you')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  it('remembers the choice after a reload', async () => {
    localStorage.setItem(STORAGE_KEY, 'en')

    // A reload is a fresh start reading the same storage.
    await initI18n()

    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('ignores a stored value it does not understand', async () => {
    localStorage.setItem(STORAGE_KEY, 'klingon')

    await initI18n()

    expect(i18n.language).toBe('da')
  })
})

describe('LanguageSwitcher', () => {
  it('is a labelled group of buttons whose names include their visible text', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByRole('group', { name: 'Sprog' })).toBeInTheDocument()
    const danish = screen.getByRole('button', { name: 'DA – Dansk' })
    expect(danish).toHaveAttribute('aria-pressed', 'true')
    expect(danish).toHaveAttribute('lang', 'da')
    expect(screen.getByRole('button', { name: 'EN – English' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('works with the keyboard alone', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'EN – English' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(i18n.language).toBe('en')
    expect(screen.getByRole('button', { name: 'EN – English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('has no detectable accessibility problems in either language', async () => {
    const { container } = render(<LanguageSwitcher />)
    expect(await accessibilityViolations(container)).toEqual([])

    await userEvent.setup().click(screen.getByRole('button', { name: 'EN – English' }))
    expect(await accessibilityViolations(container)).toEqual([])
  })
})
