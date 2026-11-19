import { beforeEach, describe, expect, it, vi } from 'vitest'

const keycloak = vi.hoisted(() => ({
  init: vi.fn<(options: Record<string, unknown>) => Promise<boolean>>(),
  authenticated: false as boolean,
  tokenParsed: undefined as Record<string, unknown> | undefined,
}))

vi.mock('keycloak-js', () => ({
  default: class {
    init = keycloak.init
    get authenticated() {
      return keycloak.authenticated
    }
    get tokenParsed() {
      return keycloak.tokenParsed
    }
  },
}))

// The module keeps the sign-in state, so each test gets a fresh copy.
const load = () => import('./keycloak')

beforeEach(() => {
  vi.resetModules()
  keycloak.init.mockReset()
  keycloak.authenticated = false
  keycloak.tokenParsed = undefined
})

describe('initAuth', () => {
  it('gives up on the silent check quickly instead of waiting 10 seconds', async () => {
    keycloak.init.mockResolvedValue(false)
    const { initAuth, AUTH_TIMEOUT_MS } = await load()

    await initAuth()

    const options = keycloak.init.mock.calls[0][0]
    expect(options.checkLoginIframe).toBe(false)
    expect(options.messageReceiveTimeout).toBe(AUTH_TIMEOUT_MS)
    expect(AUTH_TIMEOUT_MS).toBeLessThanOrEqual(3000)
  })

  it('is not ready until the check finishes, then tells subscribers', async () => {
    let finish!: () => void
    keycloak.init.mockReturnValue(new Promise<boolean>((resolve) => (finish = () => resolve(true))))
    const { initAuth, authSnapshot, subscribeAuth } = await load()
    const listener = vi.fn<() => void>()
    subscribeAuth(listener)

    const done = initAuth()
    expect(authSnapshot()).toEqual({ ready: false, user: null })

    keycloak.authenticated = true
    keycloak.tokenParsed = { sub: 'u-1', given_name: 'Maja', realm_access: { roles: ['citizen'] } }
    finish()
    await done

    expect(listener).toHaveBeenCalledOnce()
    expect(authSnapshot()).toEqual({
      ready: true,
      user: { id: 'u-1', name: 'Maja', roles: ['citizen'] },
    })
  })

  it('continues as a guest when Keycloak times out', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    keycloak.init.mockRejectedValue(
      new Error('Timeout when waiting for 3rd party check iframe message.'),
    )
    const { initAuth, authSnapshot } = await load()

    await initAuth()

    expect(authSnapshot()).toEqual({ ready: true, user: null })
  })
})
