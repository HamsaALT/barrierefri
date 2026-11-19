import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import da from './da.json'
import en from './en.json'

export const LANGUAGES = ['da', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

export const STORAGE_KEY = 'barrierefri.language'

function storedLanguage(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'da' || stored === 'en' ? stored : null
  } catch {
    return null
  }
}

/**
 * Danish unless the user picked English before. The browser's own language is
 * ignored on purpose: the service is Danish, and a first visit starts in Danish.
 */
export async function initI18n(): Promise<void> {
  const lang = storedLanguage() ?? 'da'
  await i18n.use(initReactI18next).init({
    resources: { da: { translation: da }, en: { translation: en } },
    lng: lang,
    fallbackLng: 'da',
    supportedLngs: LANGUAGES,
    // React already escapes everything it renders.
    interpolation: { escapeValue: false },
  })
  document.documentElement.lang = lang
}

export async function setLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Private mode or blocked storage: the choice just won't survive a reload.
  }
}

export const currentLanguage = (): Lang => (i18n.language === 'en' ? 'en' : 'da')

export const intlLocale = (): string => (currentLanguage() === 'en' ? 'en-GB' : 'da-DK')

export default i18n
