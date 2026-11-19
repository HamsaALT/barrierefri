import Keycloak from 'keycloak-js'
import { currentLanguage } from '../i18n'

// The browser talks to Keycloak directly, so these are addresses as seen from the user's machine.
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8082',
  realm: 'barrierefri',
  clientId: 'barrierefri-web',
})

export interface User {
  id: string
  name: string
  roles: string[]
}

/** What the UI knows about sign-in: whether the check has finished, and who is signed in. */
export interface AuthSnapshot {
  ready: boolean
  user: User | null
}

/**
 * How long the silent sign-in check may wait for Keycloak's iframe to answer.
 * keycloak-js waits 10 seconds by default, which is what a browser that blocks
 * third-party cookies ends up waiting. The UI no longer waits for it, but this
 * still decides when "My reports" and the case queue stop showing a skeleton.
 */
export const AUTH_TIMEOUT_MS = 2500

let initialised = false
let snapshot: AuthSnapshot = { ready: false, user: null }
const listeners = new Set<() => void>()

function publish() {
  snapshot = { ready: true, user: currentUser() }
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: the snapshot object only changes when the sign-in state does. */
export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const authSnapshot = (): AuthSnapshot => snapshot

/**
 * Checks for an existing session without forcing a login. It runs in the
 * background after the first render: the map is public, so the app starts as a
 * guest and the header updates when (and if) a session is found. If Keycloak
 * can't be reached the app simply stays a guest.
 */
export async function initAuth(): Promise<void> {
  try {
    await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
      pkceMethod: 'S256',
      // The session-status iframe polls Keycloak in a third-party context; tokens
      // are refreshed on demand in accessToken() instead.
      checkLoginIframe: false,
      messageReceiveTimeout: AUTH_TIMEOUT_MS,
    })
    initialised = true
  } catch (error) {
    console.warn('Sign-in is unavailable, continuing as a guest', error)
  } finally {
    publish()
  }
}

export function currentUser(): User | null {
  const token = keycloak.tokenParsed
  if (!initialised || !keycloak.authenticated || !token?.sub) return null
  return {
    id: token.sub,
    name: (token['given_name'] as string | undefined) ?? (token['preferred_username'] as string),
    roles: token.realm_access?.roles ?? [],
  }
}

/** A token valid for at least another 30 seconds, or undefined for guests. */
export async function accessToken(): Promise<string | undefined> {
  if (!initialised || !keycloak.authenticated) return undefined
  try {
    await keycloak.updateToken(30)
    return keycloak.token
  } catch {
    return undefined
  }
}

export const login = (returnTo = location.pathname + location.search) =>
  keycloak.login({ redirectUri: location.origin + returnTo, locale: currentLanguage() })

export const register = () =>
  keycloak.register({ redirectUri: location.origin + '/', locale: currentLanguage() })

export const logout = () => keycloak.logout({ redirectUri: location.origin + '/' })
