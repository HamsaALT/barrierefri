import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach } from 'vitest'
import i18n, { initI18n } from '../i18n'

beforeAll(async () => {
  localStorage.clear()
  await initI18n()
})

// Every test starts like a first visit: Danish, nothing stored.
beforeEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('da')
  document.documentElement.lang = 'da'
})

afterEach(() => cleanup())
