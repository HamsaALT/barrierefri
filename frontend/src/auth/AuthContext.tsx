import { useSyncExternalStore, type ReactNode } from 'react'
import { AuthContext } from './context'
import { authSnapshot, login, logout, register, subscribeAuth, type User } from './keycloak'

/**
 * Follows the background Keycloak check. Tests pass `user` (a user or null) to
 * skip Keycloak entirely; sign-in then counts as already finished.
 */
export function AuthProvider({
  children,
  user: fixedUser,
}: {
  children: ReactNode
  user?: User | null
}) {
  const live = useSyncExternalStore(subscribeAuth, authSnapshot)
  const user = fixedUser === undefined ? live.user : fixedUser
  const ready = fixedUser === undefined ? live.ready : true
  const isStaff = !!user && (user.roles.includes('staff') || user.roles.includes('admin'))
  return (
    <AuthContext.Provider value={{ ready, user, isStaff, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}
