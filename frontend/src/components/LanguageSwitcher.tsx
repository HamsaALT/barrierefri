import { useTranslation } from 'react-i18next'
import { LANGUAGES, currentLanguage, setLanguage } from '../i18n'

/**
 * Two real buttons in a fieldset whose legend names the group. aria-pressed
 * tells screen readers which language is active. Each button's accessible name starts with its visible text
 * ("DA – Dansk"), so voice control users can say "click DA" (WCAG 2.5.3), and the
 * lang attribute makes "Dansk" sound Danish even when the page is in English.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation()
  const active = currentLanguage()

  return (
    <fieldset className="language-switcher">
      <legend className="visually-hidden">{t('language.label')}</legend>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={active === lang}
          aria-label={`${lang.toUpperCase()} – ${t(`language.${lang}`)}`}
          onClick={() => void setLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </fieldset>
  )
}
