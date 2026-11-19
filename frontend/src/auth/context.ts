import { createContext, useContext } from 'react'
import type { User } from './keycloak'

export interface AuthState {
  /** False while the background sign-in check is still running. */
  ready: boolean
  user: User | null
  isStaff: boolean
  login: (returnTo?: string) => void
  logout: () => void
  register: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
