import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initAuth } from './auth/keycloak'
import { initI18n } from './i18n'

/**
 * Renders the app straight away as a guest and checks for a sign-in session in
 * the background. Waiting for Keycloak first used to leave the page blank for up
 * to ten seconds when the browser blocks third-party cookies.
 */
export async function start(container: HTMLElement, checkSignIn: () => Promise<void> = initAuth) {
  // The translations are bundled, so this doesn't touch the network.
  await initI18n()
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  void checkSignIn()
}
